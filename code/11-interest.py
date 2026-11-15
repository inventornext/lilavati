P, rate_per_100, months = 16, 5, 12

interest = P * rate_per_100 * months / 100     # rule of three
print("Interest:", interest)                   # 9.6

# reverse problems
print("Time (months):", 100 * interest / (P * rate_per_100))   # 12.0
print("Principal:", 100 * interest / (rate_per_100 * months))  # 16.0
