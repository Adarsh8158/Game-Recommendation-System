import os
import pickle
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity


def clean_text_feature(series):
    """Replace separator pipes with spaces and clean missing values."""
    return series.fillna('').astype(str).str.replace('||', ' ', regex=False).str.strip()


def build_recommendation_model(csv_path, output_dir='model', top_n=15000, top_matches=25, chunk_size=1000):
    """Build a content-based game recommender using chunked cosine similarity."""
    print(f"[+] Loading raw dataset from: {csv_path}")

    use_cols = [
        'id', 'name', 'rating', 'ratings_count', 'metacritic',
        'platforms', 'developers', 'genres', 'publishers'
    ]

    df = pd.read_csv(csv_path, usecols=use_cols)
    print(f"[*] Raw records loaded: {len(df):,}")

    df = df.dropna(subset=['name']).copy()
    df['rating'] = pd.to_numeric(df['rating'], errors='coerce').fillna(0.0)
    df['ratings_count'] = pd.to_numeric(df['ratings_count'], errors='coerce').fillna(0)
    df['metacritic'] = pd.to_numeric(df['metacritic'], errors='coerce').fillna(0)

    df = (
        df.sort_values(by=['ratings_count', 'rating', 'metacritic'], ascending=False)
        .head(top_n)
        .reset_index(drop=True)
    )
    print(f"[*] Top {len(df):,} games selected for the model.")

    for column in ['genres', 'developers', 'publishers', 'platforms']:
        df[f'clean_{column}'] = clean_text_feature(df[column])

    df['tags'] = (
        df['clean_genres'] + ' ' +
        df['clean_developers'] + ' ' +
        df['clean_publishers'] + ' ' +
        df['clean_platforms']
    ).str.lower()

    final_df = df[[
        'id', 'name', 'rating', 'ratings_count', 'metacritic',
        'clean_genres', 'clean_developers', 'clean_publishers',
        'clean_platforms', 'tags'
    ]].copy()
    final_df.rename(columns={
        'clean_genres': 'genres',
        'clean_developers': 'developers',
        'clean_publishers': 'publishers',
        'clean_platforms': 'platforms'
    }, inplace=True)

    print('[*] Vectorizing tags with CountVectorizer (5,000 max features)...')
    vectorizer = CountVectorizer(max_features=5000, stop_words='english')
    vectors = vectorizer.fit_transform(final_df['tags'])

    # Do not create an N x N dense matrix. Calculate similarities in chunks
    # and retain only the strongest matches for each game.
    print('[*] Computing top matches with chunked cosine similarity...')
    compressed_similarity = {}
    total = len(final_df)

    for start in range(0, total, chunk_size):
        end = min(start + chunk_size, total)
        chunk_similarity = cosine_similarity(vectors[start:end], vectors)

        for local_idx, scores in enumerate(chunk_similarity):
            global_idx = start + local_idx
            scores[global_idx] = -1.0  # exclude the game itself
            candidate_indices = np.argpartition(scores, -top_matches)[-top_matches:]
            candidate_indices = candidate_indices[np.argsort(scores[candidate_indices])[::-1]]
            compressed_similarity[global_idx] = [
                (int(i), round(float(scores[i]), 4))
                for i in candidate_indices
                if scores[i] >= 0
            ]

        print(f"    processed {end:,}/{total:,}")

    os.makedirs(output_dir, exist_ok=True)
    games_pkl_path = os.path.join(output_dir, 'processed_games.pkl')
    similarity_pkl_path = os.path.join(output_dir, 'similarity.pkl')

    with open(games_pkl_path, 'wb') as f:
        pickle.dump(final_df, f, protocol=pickle.HIGHEST_PROTOCOL)

    with open(similarity_pkl_path, 'wb') as f:
        pickle.dump(compressed_similarity, f, protocol=pickle.HIGHEST_PROTOCOL)

    print(f"[SUCCESS] Saved {len(final_df):,} games and top-{top_matches} matches per game.")


if __name__ == '__main__':
    project_dir = os.path.dirname(os.path.abspath(__file__))
    csv_file = os.path.join(project_dir, 'Data', 'game_info.csv')
    output_dir = os.path.join(project_dir, 'model')
    build_recommendation_model(csv_file, output_dir=output_dir)
