from itertools import permutations
from math import factorial

vishnu = ["gada", "chakra", "padma", "shankha"]
forms = list(permutations(vishnu))
print("Vishnu forms:", len(forms))          # 24
print("Shiva forms:", factorial(10))        # 3628800
print("First three:", forms[:3])
