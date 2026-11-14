h, d = 9, 27   # pillar height, snake's starting distance (hastas)

x = (d - h**2 / d) / 2      # Bhaskara's rule, verse 151
peacock = (h**2 + x**2) ** 0.5
snake = d - x
print(x, peacock, snake)    # 12.0 15.0 15.0
