import math

# Search for the swarm size x that satisfies the verse
for x in range(2, 1000, 2):
    root = math.isqrt(x // 2)
    if root * root == x // 2 and root + 8 * x / 9 + 2 == x:
        print("Bees:", x)   # Bees: 72
