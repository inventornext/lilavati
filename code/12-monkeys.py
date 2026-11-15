h, d = 100, 200          # tree height, distance to pond (hastas)
first = h + d            # 300

# x + sqrt((h + x)^2 + d^2) = first  ->  solve the linear equation
x = (first**2 - h**2 - d**2) / (2 * (first + h))
flight = ((h + x)**2 + d**2) ** 0.5
print("Leap:", x, "Flight:", flight)   # Leap: 50.0 Flight: 250.0
