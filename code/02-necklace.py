from fractions import Fraction as F

fallen = F(1, 3) + F(1, 5) + F(1, 6) + F(1, 10)
left_fraction = 1 - fallen        # 1/5 of the necklace stayed on the string
pearls = 6 / left_fraction
print("Pearls:", pearls)          # Pearls: 30
