import math

# The Sun lights a hemisphere: half of the sphere's surface 4*pi*r^2
r = 1737.4                      # Moon's radius in km
total = 4 * math.pi * r**2
lit = 2 * math.pi * r**2
print("Lit fraction:", lit / total)   # 0.5
