-- =========================================================
-- Game Analytics SQL Queries
-- Author: Adarsh Yadav
-- =========================================================

-- 1. Top 10 Highest Rated Games by Metacritic Score
SELECT 
    name, 
    metacritic, 
    rating, 
    genres, 
    developers
FROM games
WHERE metacritic IS NOT NULL AND metacritic > 0
ORDER BY metacritic DESC, rating DESC
LIMIT 10;

-- 2. Count of Games by Genre
SELECT 
    genres, 
    COUNT(*) AS total_games,
    ROUND(AVG(rating), 2) AS avg_user_rating
FROM games
WHERE genres IS NOT NULL AND genres != ''
GROUP BY genres
ORDER BY total_games DESC
LIMIT 15;

-- 3. Top Developers by Average Game Rating
SELECT 
    developers, 
    COUNT(*) AS game_count,
    ROUND(AVG(metacritic), 1) AS avg_metacritic
FROM games
WHERE developers IS NOT NULL AND metacritic > 75
GROUP BY developers
HAVING game_count >= 3
ORDER BY avg_metacritic DESC;
