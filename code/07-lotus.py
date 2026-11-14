h = 0.5   # lotus tip above water (hastas)
b = 2.0   # horizontal distance where it submerges (hastas)

d = (b**2 - h**2) / (2 * h)
print("Depth:", d, "hastas")              # Depth: 3.75 hastas
print("About", round(d * 0.45, 2), "m")   # About 1.69 m
