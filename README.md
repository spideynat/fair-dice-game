# 🎲 Fair Dice Game

A console-based generalized non-transitive dice game with provable fairness using HMAC (SHA3-256). Built with Node.js.

## 🚀 How to Run

```

node index.js DICE1 DICE2 DICE3 ...

```

Each DICE is a comma-separated list of integers.

### Example:
```

node index.js 2,2,4,4,9,9 1,1,6,6,8,8 3,3,5,5,7,7

```

## ❓ Help

During the game, type `?` to see the win probability table.

## ⚠️ Handles Invalid Inputs:

- No dice
- Less than 3 dice
- Dice with different number of sides
- Non-integer values

## 🔐 Fairness

Before your turn, computer:
- Picks its die and value
- Generates a random key
- Calculates HMAC(key, value)
- Shows HMAC

After your turn, key is revealed so you can verify HMAC → proof that the move was not changed.

