# 🎮 Game Recommendation System

![Python](https://img.shields.io/badge/Python-3.9%2B-blue?logo=python)
![Flask](https://img.shields.io/badge/Flask-3.0-black?logo=flask)
![Scikit-learn](https://img.shields.io/badge/Scikit--learn-1.2%2B-orange?logo=scikitlearn)
![License](https://img.shields.io/badge/License-MIT-green)

**Content-based Video Game Recommendation System** built with Machine Learning (CountVectorizer + Cosine Similarity), Flask REST API, and a modern interactive frontend.

The system analyzes game metadata (genres, developers, publishers, platforms) from **15,000+ games** and recommends similar titles instantly.

---

## ✨ Features

- 🎯 **Content-Based Recommendations** using CountVectorizer + Cosine Similarity
- 🎮 **15,000-game catalog** prepared from the RAWG dataset
- 🔍 Search & multi-filter (name, genre, platform, Metacritic, sort)
- 📊 Live analytics charts (Chart.js) — Top Genres + Rating vs Metacritic
- ⚡ Pre-computed top-25 similar games for fast response
- 🐍 Flask REST API + clean HTML/CSS/JS frontend
- 📈 Extra R statistical analysis script
- 🗄️ SQL analytical queries included
- 💾 Model files included — run without rebuilding

---

## 📸 Screenshots

### 1. Game Recommender
Search any game → get top similar recommendations with similarity %.

![Game Recommender](screenshots/01-recommender.png)

### 2. Explore & Filter Catalog
Filter by keyword, genre, platform, Metacritic score + sort options.

### 3. Data Analytics
Top 12 genres bar chart + User Rating vs Metacritic scatter plot.

### 4. ML Architecture
Full pipeline diagram + Cosine Similarity formula.

> Add `02-explore.png`, `03-analytics.png`, `04-architecture.png` in `screenshots/` folder for complete gallery.

---

## 🧠 How It Works

```
RAWG Dataset (474k+ games)
        ↓
preprocess.py → Select Top 15,000 games
        ↓
Combine: Genres + Developers + Publishers + Platforms
        ↓
CountVectorizer (max 5,000 features)
        ↓
Chunked Cosine Similarity (top-25 matches only)
        ↓
model/processed_games.pkl + model/similarity.pkl
        ↓
Flask API → Interactive Web UI
```

**Why Cosine Similarity?**  
It measures the angle between two feature vectors. Higher value = more similar metadata profile.

---

## 🛠️ Tech Stack

| Layer          | Technology                          |
|----------------|-------------------------------------|
| Language       | Python 3.9+                         |
| ML             | Scikit-learn, Pandas, NumPy         |
| Backend        | Flask                               |
| Frontend       | HTML5, CSS3, JavaScript, Chart.js   |
| Analysis       | R, SQL                              |
| Serialization  | Pickle                              |

---

## 📁 Project Structure

```
Game-Recommendation-System/
├── Data/
│   └── game_info.csv              # RAWG raw dataset
├── model/
│   ├── processed_games.pkl        # Cleaned 15k games
│   └── similarity.pkl             # Compressed similarity matrix
├── queries/
│   └── game_analytics.sql
├── screenshots/                   # App screenshots
├── static/
│   ├── script.js
│   └── style.css
├── templates/
│   └── index.html
├── app.py                         # Flask backend
├── preprocess.py                  # Model building pipeline
├── R_statistical_analysis.R
├── requirements.txt
├── LICENSE
├── .gitignore
└── README.md
```

---

## 🚀 Run Locally

### 1. Extract / Clone
```bash
unzip Game-Recommendation-System-Fixed.zip
cd Game-Recommendation-System-main
```

### 2. Create Virtual Environment

**Windows**
```powershell
python -m venv venv
venv\Scripts\activate
```

**macOS / Linux**
```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Start the App
```bash
python app.py
```

Open: **http://127.0.0.1:5000**

### 5. Rebuild Model (Optional)
```bash
python preprocess.py
```

---

## 🔌 API Endpoints

| Endpoint         | Method | Description                        |
|------------------|--------|------------------------------------|
| `/`              | GET    | Web Application                    |
| `/api/meta`      | GET    | Dataset stats + filter options     |
| `/api/recommend` | POST   | Get similar game recommendations   |
| `/api/explore`   | GET    | Search & filter catalog            |
| `/api/analytics` | GET    | Chart data                         |

**Example Request**
```json
POST /api/recommend
{
  "game_name": "The Witcher 3: Wild Hunt",
  "top_n": 6,
  "min_sim": 25
}
```

---

## 📊 Dataset

- **Source**: [RAWG API](https://rawg.io/apidocs)  
  (via [Kaggle – Video Game Dataset by Trung Hoang](https://www.kaggle.com/datasets/jummyegg/rawg-game-dataset))
- **Original size**: ~474,000 games
- **Used in model**: Top 15,000 (by ratings_count + rating + metacritic)
- **Features used**: genres, developers, publishers, platforms
- **Separator**: `||`

---

## ⚡ Performance Note

Full 15,000 × 15,000 similarity matrix is memory-heavy.  
The pipeline computes similarity in **chunks** and stores only the **top-25 matches** per game — fast & lightweight.

---

## 📜 License

This project is licensed under the **MIT License**.  
See [LICENSE](LICENSE) for details.

---

## 👨‍💻 Author

**Adarsh Yadav**  
GitHub: [Adarsh8158](https://github.com/Adarsh8158)
