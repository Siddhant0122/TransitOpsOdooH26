import sys
import os

# Redirect to scripts.seed_all
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from scripts.seed_all import main

if __name__ == "__main__":
    main()
