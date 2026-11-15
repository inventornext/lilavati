circumference = (100 + 4) * 8 + 62000   # 62832
diameter = 20000                          # two ayutas
pi = circumference / diameter
print("Circumference:", circumference)
print("Aryabhata's pi:", pi)              # 3.1416

import math
print("Error:", abs(pi - math.pi))        # about 0.0000073
