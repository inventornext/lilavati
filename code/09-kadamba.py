from fractions import Fraction as F

for x in range(1, 200):
    kadamba, silindhra = F(x, 5), F(x, 3)
    kutaja = 3 * (silindhra - kadamba)
    if kadamba + silindhra + kutaja + 1 == x:
        print("Bees:", x)    # Bees: 15
