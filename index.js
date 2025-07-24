// index.js

const crypto = require('crypto');
const prompt = require('prompt-sync')();
const AsciiTable = require('ascii-table');

// Dice abstraction
class Dice {
  constructor(faces) {
    this.faces = faces;
  }

  roll(index) {
    return this.faces[index];
  }

  get length() {
    return this.faces.length;
  }

  toString() {
    return `[${this.faces.join(',')}]`;
  }
}

// Input parser class
class DiceParser {
  static parse(args) {
    if (args.length < 3) {
      throw new Error(`You must provide at least 3 dice.
Example: node index.js 2,2,4,4,9,9 6,8,1,1,8,6 7,5,3,7,5,3`);
    }

    return args.map((arg, i) => {
      const nums = arg.split(',').map(Number);

      if (nums.length < 2 || nums.some(isNaN)) {
        throw new Error(`Invalid dice at position ${i + 1}. Each dice must have at least 2 integers.
Example: node index.js 2,2,4,4,9,9 6,8,1,1,8,6 7,5,3,7,5,3`);
      }

      return new Dice(nums);
    });
  }
}

// Secure random + HMAC generator
class SecureRandom {
  static generateKey() {
    return crypto.randomBytes(32); 
  }

  static generateNumber(max) {
    let rand;
    do {
      rand = crypto.randomBytes(1)[0];
    } while (rand >= 256 - (256 % (max + 1)));
    return rand % (max + 1);
  }

  static generateHMAC(key, message) {
    return crypto.createHmac('sha3-256', key).update(String(message)).digest('hex');
  }
}

// Fair generation protocol
class FairRandom {
  constructor(rangeMax) {
    this.rangeMax = rangeMax;
    this.secretKey = SecureRandom.generateKey();
    this.computerValue = SecureRandom.generateNumber(rangeMax);
    this.hmac = SecureRandom.generateHMAC(this.secretKey, this.computerValue);
  }

  getHMAC() {
    return this.hmac;
  }

  resolve(userValue) {
    const total = (this.computerValue + userValue) % (this.rangeMax + 1);
    return {
      computerValue: this.computerValue,
      key: this.secretKey.toString('hex'),
      result: total
    };
  }
}

// Probability calculator
class ProbabilityCalculator {
  static winProbability(dice1, dice2) {
    let win = 0;
    let total = dice1.length * dice2.length;

    for (let i = 0; i < dice1.length; i++) {
      for (let j = 0; j < dice2.length; j++) {
        if (dice1.faces[i] > dice2.faces[j]) win++;
      }
    }

    return (win / total).toFixed(2);
  }
}

// Help Table
class HelpTable {
  static show(diceList) {
    const table = new AsciiTable('Winning Probabilities');
    const headers = ['Dice'].concat(diceList.map((d, i) => `D${i}`));
    table.setHeading(...headers);

    diceList.forEach((d1, i) => {
      const row = [`D${i}`];
      diceList.forEach((d2, j) => {
        if (i === j) {
          row.push('-');
        } else {
          row.push(ProbabilityCalculator.winProbability(d1, d2));
        }
      });
      table.addRow(...row);
    });

    console.log(table.toString());
  }
}

// Game Engine
class DiceGame {
  constructor(diceList) {
    this.diceList = diceList;
    this.exitFlag = false;
  }

  askFairIndex(max, message) {
    const fr = new FairRandom(max);
    console.log(`${message} (HMAC=${fr.getHMAC()})`);

    while (true) {
      const input = prompt(`Choose 0 to ${max}, X to exit, ? for help: `).toUpperCase();
      if (input === 'X') process.exit(0);
      if (input === '?') {
        HelpTable.show(this.diceList);
        continue;
      }
      const val = parseInt(input);
      if (!isNaN(val) && val >= 0 && val <= max) {
        const resolved = fr.resolve(val);
        console.log(`My number: ${resolved.computerValue} (KEY=${resolved.key})`);
        console.log(`Result: ${val} + ${resolved.computerValue} = ${resolved.result} (mod ${max + 1})`);
        return resolved.result;
      } else {
        console.log('Invalid input.');
      }
    }
  }

  run() {
    console.log("Let's determine who selects dice first.");
    const firstMove = this.askFairIndex(1, "I selected a number in range 0..1");

    let userDiceIndex;
    if (firstMove === 0) {
      console.log("You select the dice first.");
      userDiceIndex = this.selectDice();
    } else {
      console.log("I select the dice first.");
      userDiceIndex = this.computerSelectDice();
    }

    const remaining = this.diceList.map((_, i) => i).filter(i => i !== userDiceIndex);
    const otherDiceIndex = this.selectOtherDice(remaining, userDiceIndex);

    const userDice = this.diceList[userDiceIndex];
    const compDice = this.diceList[otherDiceIndex];

    const compRoll = this.performRoll(compDice, "computer");
    const userRoll = this.performRoll(userDice, "your");

    console.log(`Your roll: ${userRoll}`);
    console.log(`My roll: ${compRoll}`);

    if (userRoll > compRoll) console.log("You win!");
    else if (compRoll > userRoll) console.log("I win!");
    else console.log("It's a tie!");
  }

  selectDice() {
    while (true) {
      this.diceList.forEach((d, i) => console.log(`${i}: ${d.toString()}`));
      const input = prompt("Choose your dice: ");
      const val = parseInt(input);
      if (!isNaN(val) && val >= 0 && val < this.diceList.length) return val;
      console.log("Invalid selection.");
    }
  }

  computerSelectDice() {
    const idx = SecureRandom.generateNumber(this.diceList.length - 1);
    console.log(`I choose dice ${idx}: ${this.diceList[idx]}`);
    return idx;
  }

  selectOtherDice(availableIndices, taken) {
    while (true) {
      availableIndices.forEach(i => console.log(`${i}: ${this.diceList[i]}`));
      const input = prompt("Choose remaining dice: ");
      const val = parseInt(input);
      if (availableIndices.includes(val)) return val;
      console.log("Invalid selection.");
    }
  }

  performRoll(dice, owner) {
    const rollIndex = this.askFairIndex(dice.length - 1, `Rolling for ${owner}`);
    return dice.roll(rollIndex);
  }
}

// Entry Point
try {
  const diceList = DiceParser.parse(process.argv.slice(2));
  const game = new DiceGame(diceList);
  game.run();
} catch (e) {
  console.error(`Error: ${e.message}`);
}
