"""
Game Recommendation Engine — Flask Backend
===========================================
Serves REST API endpoints for game recommendations, catalog filtering,
and data analytics, rendering an interactive HTML5/CSS3/JS frontend.

Author: Adarsh Yadav
"""

import os
import pickle
import numpy as np
import pandas as pd
from flask import Flask, render_template, jsonify, request

app = Flask(__name__)

# Resolve paths relative to this file so the project works from any working directory.
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
GAMES_PATH = os.path.join(BASE_DIR, 'model', 'processed_games.pkl')
SIMILARITY_PATH = os.path.join(BASE_DIR, 'model', 'similarity.pkl')

if not os.path.exists(GAMES_PATH) or not os.path.exists(SIMILARITY_PATH):
    raise FileNotFoundError("Model files missing! Please run preprocess.py first.")

with open(GAMES_PATH, "rb") as f:
    GAMES_DF = pickle.load(f)
with open(SIMILARITY_PATH, "rb") as f:
    SIMILARITY_MATRIX = pickle.load(f)

# Dynamic genres & platforms extracted from data (no hardcoding)
ALL_GENRES = sorted(list(set(
    g for sub in GAMES_DF['genres'].dropna().str.split()
    for g in sub if len(g) > 2
)))

ALL_PLATFORMS = sorted(list(set(
    p for sub in GAMES_DF['platforms'].dropna().str.split()
    for p in sub if len(p) > 1
)))


# ---------------------------------------------------------
# ROUTES
# ---------------------------------------------------------
@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/meta")
def api_meta():
    """Returns dataset stats and filter dropdown options."""
    valid_meta = GAMES_DF[GAMES_DF['metacritic'] > 0]['metacritic']
    avg_meta = int(valid_meta.mean()) if len(valid_meta) > 0 else 75

    return jsonify({
        "total_games": len(GAMES_DF),
        "total_genres": len(ALL_GENRES),
        "avg_metacritic": avg_meta,
        "genres": ALL_GENRES,
        "platforms": ALL_PLATFORMS,
        "game_names": GAMES_DF['name'].tolist()[:5000]  # Top 5,000 for fast autocomplete
    })


@app.route("/api/recommend", methods=["POST"])
def api_recommend():
    """Calculates top N similar games from compressed similarity model."""
    data = request.get_json() or {}
    game_name = (data.get("game_name") or "").strip()
    top_n = max(1, min(int(data.get("top_n", 6)), 25))
    min_sim = float(data.get("min_sim", 0))

    if not game_name:
        return jsonify({"error": "Please provide a game name."}), 400

    # Prefer exact match (case-insensitive), then partial match
    exact = GAMES_DF[GAMES_DF['name'].str.lower() == game_name.lower()]
    if not exact.empty:
        idx = exact.index[0]
        game_name = exact.iloc[0]['name']
    else:
        matches = GAMES_DF[GAMES_DF['name'].str.contains(
            game_name, case=False, na=False, regex=False
        )]
        if matches.empty:
            return jsonify({"error": f"Game '{game_name}' not found in database."}), 404
        idx = matches.index[0]
        game_name = matches.iloc[0]['name']

    # Retrieve pre-computed top 25 matches for selected game
    matches = SIMILARITY_MATRIX.get(idx, [])

    results = []
    for match_idx, sim_val in matches:
        sim_pct = round(float(sim_val) * 100, 1)
        if sim_pct < min_sim:
            continue

        g = GAMES_DF.iloc[match_idx]
        results.append({
            "name": str(g['name']),
            "rating": float(g['rating']),
            "metacritic": int(g['metacritic']),
            "genres": str(g['genres']),
            "developers": str(g['developers']),
            "publishers": str(g['publishers']),
            "platforms": str(g['platforms']),
            "similarity": sim_pct
        })
        if len(results) >= top_n:
            break

    return jsonify({
        "selected_game": game_name,
        "recommendations": results
    })


@app.route("/api/explore")
def api_explore():
    """Live catalog search and multi-filtering endpoint."""
    search_kw = request.args.get("search", "").strip().lower()
    genre_filter = request.args.get("genre", "").strip()
    platform_filter = request.args.get("platform", "").strip()
    min_meta = int(request.args.get("min_meta", 0))
    sort_by = request.args.get("sort", "rating")

    df = GAMES_DF.copy()

    if search_kw:
        df = df[
            df['name'].str.lower().str.contains(search_kw, na=False, regex=False) |
            df['developers'].str.lower().str.contains(search_kw, na=False, regex=False) |
            df['genres'].str.lower().str.contains(search_kw, na=False, regex=False)
        ]

    if genre_filter and genre_filter != "All Genres":
        df = df[df['genres'].str.contains(genre_filter, case=False, na=False, regex=False)]

    if platform_filter and platform_filter != "All Platforms":
        df = df[df['platforms'].str.contains(platform_filter, case=False, na=False, regex=False)]

    df = df[df['metacritic'] >= min_meta]

    if sort_by == "metacritic":
        df = df.sort_values(by="metacritic", ascending=False)
    elif sort_by == "ratings_count":
        df = df.sort_values(by="ratings_count", ascending=False)
    elif sort_by == "name":
        df = df.sort_values(by="name", ascending=True)
    else:
        df = df.sort_values(by="rating", ascending=False)

    results = []
    for _, row in df.head(60).iterrows():
        results.append({
            "name": str(row['name']),
            "rating": float(row['rating']),
            "metacritic": int(row['metacritic']),
            "genres": str(row['genres']),
            "developers": str(row['developers']),
            "platforms": str(row['platforms'])
        })

    return jsonify({
        "total_matches": len(df),
        "games": results
    })


@app.route("/api/analytics")
def api_analytics():
    """Returns analytics data for Chart.js charts."""
    genre_series = GAMES_DF['genres'].str.split().explode()
    top_genres = genre_series[genre_series.str.len() > 2].value_counts().head(12)

    # Random sample for scatter plot (more representative than head)
    valid = GAMES_DF[(GAMES_DF['rating'] > 0) & (GAMES_DF['metacritic'] > 0)]
    sample = valid.sample(n=min(500, len(valid)), random_state=42) if len(valid) > 0 else valid

    return jsonify({
        "genre_labels": top_genres.index.tolist(),
        "genre_counts": top_genres.values.tolist(),
        "user_ratings": sample['rating'].tolist(),
        "metacritic_scaled": (sample['metacritic'] / 20).tolist()
    })


if __name__ == "__main__":
    app.run(debug=True, port=5000)
