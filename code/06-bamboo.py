h, b = 32, 16    # bamboo height, distance where the top touches (hastas)

x = (h - b**2 / h) / 2           # Bhaskara's rule, same as the peacock verse
print("Broken at", x, "hastas")  # Broken at 12.0 hastas
print("Check:", x**2 + b**2 == (h - x)**2)   # True
