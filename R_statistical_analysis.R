# =========================================================
# Game Recommendation & Analytics Engine - R Statistical Analysis
# Author: Adarsh Yadav
# Purpose: Exploratory Data Analysis & Descriptive Statistics in R
# =========================================================

# 1. Load RAWG Dataset
dataset_path <- "Data/game_info.csv"

if (file.exists(dataset_path)) {
  cat("[+] Loading dataset in R...\n")
  games_data <- read.csv(dataset_path, stringsAsFactors = FALSE)
  
  # Display basic structure
  cat("===== DATASET STRUCTURE =====\n")
  str(games_data)
  
  # Summary of Metacritic and User Ratings
  cat("\n===== RATING SUMMARY STATISTICS =====\n")
  print(summary(games_data$rating))
  print(summary(games_data$metacritic))
  
  # Filter games with Metacritic scores > 80
  top_tier_games <- subset(games_data, metacritic >= 80)
  cat("\nNumber of Top Tier Games (Metacritic >= 80):", nrow(top_tier_games), "\n")
  
  # Descriptive Statistics
  cat("\nMean Rating:", mean(games_data$rating, na.rm = TRUE), "\n")
  cat("Standard Deviation:", sd(games_data$rating, na.rm = TRUE), "\n")
  
} else {
  cat("[-] Dataset file not found at path:", dataset_path, "\n")
}
