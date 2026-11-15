from fractions import Fraction as F

times = [F(1), F(1, 2), F(1, 3), F(1, 6)]     # days for each stream alone
rate = sum(1 / t for t in times)              # tanks per day, like adding conductances
together = 1 / rate
print("Fraction of a day:", together)          # 1/12
print("Hours:", together * 24)                 # 2
