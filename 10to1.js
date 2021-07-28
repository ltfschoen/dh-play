class Contracts {
  tokenLockContractAddressMappings = {};

  addTokenLockContractAddressMapping(contractData) {
    this.tokenLockContractAddressMappings[contractData.lockContractAddress];
  }

  isLockContractOwner(lockContractAddress, userEthereumAddress) {
    if (this.tokenLockContractAddressMappings[tokenLockContractAddress].lockContractOwner !== userEthereumAddress) {
        // calling user was found not to be the owner of the tokenContractAddress
        return false;
    }
    return true;
  }

  getByAccountTheLockInfo(userEthereumAddress) {
    // TODO - on chain store by account and lock contract address for lookup

    let res = {};
  
    Object.keys(this.tokenLockContractAddressMappings).forEach(function(key) {
        // console.log(key, this.tokenLockContractAddressMappings[key]);
  
        if (this.isLockContractOwner(key, userEthereumAddress)) {
          res[key] = tokenLockContractAddressMappings[key];
        }
    });
  
    return res;
  }

  getByTokenLockContractAddressTheTokenCategoryAndRewardCategoryMultiplier() {
    // TODO - call `getByAccountTheLockInfo` and return only the Token Category and Reward Category Multiplier properties
  }

  getByTokenCategoryAndDurationTheMiningDurationBonus(tokenCategory, duration) {
    // TODO - fix this logic

    // // customised by governance at any time
    // let tokenCategoryAndDurationMappings = {
    //     [1, 24]: 1.4,
    // };
  
    // Object.keys(tokenCategoryAndDurationMappings).forEach(function(key) {
    //     console.log(key, tokenCategoryAndDurationMappings[key]);
  
    //     if ([tokenCategory, duration] == key) {
    //         res = tokenCategoryAndDurationMappings[tokenCategory, duration];
    //     }
    // });
  
    // return res;
    return 1.4;
  }
}

class Global {
  // customised by governance at any time. this changes each year
  // https://docs.google.com/spreadsheets/d/1W2AzOH9Cs9oCR8UYfYCbpmd9X7hp-USbYXL7AuwMY_Q/edit#gid=970997021
  addRewardsAllowanceDHXDailyToHistoryForDate(rewardsAllowanceDHXDaily) {
    let date = Date.now();
    this.rewardsAllowanceDHXDailyHistory[date] = {
      rewardsAllowanceDHXDaily: rewardsAllowanceDHXDaily || 5000,
      date: date,
    };
  }

  get getRewardsAllowanceDHXDaily() {
    let date = Date.now();
    return this.rewardsAllowanceDHXDailyHistory[date].rewardsAllowanceDHXDaily;
  }

  reduceRemainingRewardsAllowanceDHXDaily(dailyRewards) {
    let date = Date.now();
    this.rewardsAllowanceDHXDailyHistory[date] = {
      rewardsAllowanceDHXDaily: this.rewardsAllowanceDHXDailyHistory[date].rewardsAllowanceDHXDaily - dailyRewards,
      date: date,
    };
  }

  // FIXME - we're passing in an array of users `usersBondingCurrently`, but only passing in a single
  // user to process its rewards. we need to process all users for processing their rewards
  runOnFinalize(usersBondingCurrently, usersMPowerCurrently, userRewards, global, globalBonding) {
    if (
      // check current time and only run at a specific hour of each day
    ) {
      // Calculate and store rewards Part 1/2 - Bonded DHX

      usersBondingCurrently.forEach(function(userBonding) {
        console.log('userBonding userId: ', userBonding.userId);

        if (userBonding.isBondingDHX()) {
          userBonding.decrementRemainingIntervalMultiplierDays();

          let startNextInterval = userBonding.shouldStartNextInterval();
          if (startNextInterval) {
            userBonding.remainingIntervalMultiplierDays = globalBonding.intervalMultiplierDays;
          }

          let nextMinBondedDhxRequiredDaily = userBonding.getNextMinBondedDhxRequiredDaily(userBonding.remainingIntervalMultiplierDays, globalBonding);
          console.log('nextMinBondedDhxRequiredDaily: ', nextMinBondedDhxRequiredDaily);

          // Rewards Part 1/2 - Bonded DHX
          // note: since combined rewards = bonding rewards + mPower rewards
          // TODO - this is account-specific, pass the account as a parameter
          let dailyRewardBondingDHX = getDayRewardFromBondingInDHX(
            global.getRewardsAllowanceDHXDaily(),
            globalBonding.globalBondingSettings.minBondedDHXDailyCurrent,
          );
          global.reduceRemainingRewardsAllowanceDHXDaily(dailyRewardBondingDHX);
          console.log('dailyRewardBondingDHX', dailyRewardBondingDHX);
          // reward distribution per user
          // TODO - think how to distribute only after calculated their eligibility
          // for both bonded DHX + mPower rewards instead of separately to reduce tx fees
          userRewards.addUserBondedDHXToDistributionHistoryForDate(dailyRewardBondingDHX);
        }
      });

      // Calculate and store rewards Part 2/2 - mPower DHX

      usersMPowerCurrently.forEach(function(userMPower) {
        if (userMPower.hasMPower()) {
          // calc. DHX reward per mPower based on the total mPower of all accounts
          let dailyRewardMPower = getDayRewardFromMPowerInDHX(
            globalMPower.getTodayTotalMPower(),
            global.getRewardsAllowanceDHXDaily(), // gets the remaining
            globalMPower.globalMPowerSettings.minMPowerDailyCurrent,
          );
          global.reduceRemainingRewardsAllowanceDHXDaily(dailyRewardMPower);
          console.log('dailyRewardMPower', dailyRewardMPower);
          // reward distribution per user
          userRewards.addUserMPowerToDistributionHistoryForDate(dailyRewardMPower);
        }
      });

      // TODO - before distributing bonded DHX + mPower rewards in the code above,
      // check if they have finished their cooling-off period, otherwise store the reward
      // along with a flag unpaid, and then in future when check determines they have finished their
      // cooling off period, we paid the last 7 days that are flagged as unpaid.

      // coolingOffDaysRemaining = coolingOffDaysRemaining - 1;
      // console.log('coolingOffDaysRemaining: ', coolingOffDaysRemaining);

      // console.log('coolingOffDaysRemaining', coolingOffDaysRemaining);
      // if (coolingOffDaysRemaining == 0) {
      //     // TODO - distribute rewards after check if ready to distribute rewards
      // }
    }
  }
}

class GlobalBonding {
  updateGlobalBondingSettings(globalBondingSettings) {
    this.globalBondingSettings = globalBondingSettings;
  }
}

class GlobalMPower {
  totalMPowerHistory = {};

  updateGlobalMPowerSettings(globalMPowerSettings) {
    this.globalMPowerSettings = globalMPowerSettings;
  }

  addTotalMPowerToHistoryForDate(totalMPowerCurrent) {
    let date = Date.now();
    this.totalMPowerHistory[date] = {
      totalMPower: totalMPowerCurrent,
      date: date,
    };
  }

  getTodayTotalMPower() {
    let date = Date.now();
    return this.totalMPowerHistory[date].totalMPower;
  }
}

class GlobalBondingSettings {
  constructor({
    intervalMultiplierEnabled, intervalMultiplierReset, intervalMultiplierCurrent, intervalMultiplierDays,
    coolingOffPeriodDays, coolingOffDaysRemaining, minBondedDHXDailyDefault,
    minBondedDHXDailyCurrent
  }) {
    // customised by governance at any time. should increase by multiplier at interval. (on == 1; off == 0)
    this.intervalMultiplierEnabled = intervalMultiplierEnabled;
    // customised by user at any time
    this.intervalMultiplierReset = intervalMultiplierReset;
    // customised by governance at any time or override automatically by multiplier. multiplier to increase min. bonded DHX required daily to DHX Mine after each interval
    this.intervalMultiplierCurrent = intervalMultiplierCurrent;
    // customised by governance at any time
    this.intervalMultiplierDays = intervalMultiplierDays;
    // customised by governance at any time
    this.coolingOffPeriodDays = coolingOffPeriodDays;
    this.coolingOffDaysRemaining = coolingOffDaysRemaining;
    // customised by governance at any time. initial min. bonded DHX required daily to DHX Mine during interval
    this.minBondedDHXDailyDefault = minBondedDHXDailyDefault;
    this.minBondedDHXDailyCurrent = minBondedDHXDailyCurrent;
  }
}

class GlobalMPowerSettings {
  constructor({minMPowerDailyDefault, minMPowerDailyCurrent
  }) {
    this.minMPowerDailyDefault = minMPowerDailyDefault;
    this.minMPowerDailyCurrent = minMPowerDailyCurrent;
  }
}

class User {
  constructor(userId) {
    this.userId = userId;
  }
}

class UserBonding extends User {
  bondedDHXHistory = {};
  remainingIntervalMultiplierDays = 5;

  constructor(userId, globalBonding) {
    super(userId); // call the super class constructor and pass in the name parameter

    // customised by user at any time.
    this.bondedDHXCurrent = 20;
    this.remainingIntervalMultiplierDays = globalBonding.intervalMultiplierDays;
  }

  isBondingDHX() {
    return this.bondedDHXCurrent > 0;
  }

  decrementRemainingIntervalMultiplierDays() {
    this.remainingIntervalMultiplierDays -= 1;
  }

  shouldStartNextInterval() {
    if (this.remainingIntervalMultiplierDays == 0) {
        console.log('shouldStartNextInterval', true);
        return true;
    }
    console.log('shouldStartNextInterval', false);
    return false;
  }

  getNextMinBondedDhxRequiredDaily(remainingIntervalMultiplierDays, globalBonding) {
    if (!globalBonding.globalBondingSettings) {
      console.log('getNextMinBondedDhxRequiredDaily - unable to process prior to updating instance with globalBondingSettings');
      return;
    }

    if (globalBonding.globalBondingSettings.intervalMultiplierReset) {
        this.nextMinBondedDhxRequiredDaily = globalBonding.globalBondingSettings.minBondedDHXDailyDefault;
    }
  
    if (globalBonding.globalBondingSettings.intervalMultiplierEnabled) {
        if (remainingIntervalMultiplierDays == 0) {
            // double at and of interval when turned on and until reset
            this.nextMinBondedDhxRequiredDaily =
                globalBonding.globalBondingSettings.minBondedDHXDailyCurrent * globalBonding.globalBondingSettings.intervalMultiplierCurrent;
        } else {
            this.nextMinBondedDhxRequiredDaily =
                globalBonding.globalBondingSettings.minBondedDHXDailyCurrent;
        }
    } else {
        this.nextMinBondedDhxRequiredDaily = globalBonding.globalBondingSettings.minBondedDHXDailyCurrent;
    }
  
    return this.nextMinBondedDhxRequiredDaily;
  }

  hasMinBondedDhxRequiredDaily(minBondedDHXDailyCurrent) {
    // TODO - does it need to be greater than `globalBonding.globalBondingSettings.minBondedDHXDailyCurrent` too if 
    // `this.nextMinBondedDhxRequiredDaily` is not yet defined?
    console.log('hasMinBondedDhxRequiredDaily: ', this.bondedDHXCurrent >= this.nextMinBondedDhxRequiredDaily && this.bondedDHXCurrent >= minBondedDHXDailyCurrent);
    return this.bondedDHXCurrent >= this.nextMinBondedDhxRequiredDaily && this.bondedDHXCurrent >= minBondedDHXDailyCurrent;
  }
  
  calcDayRewardInDHXBasedOnBondedDHX() {
    console.log('calcDayRewardInDHXBasedOnBondedDHX: ', 1 / this.bondedDHXCurrent)
    return 1 / this.bondedDHXCurrent;
  }
  
  getDayRewardFromBondingInDHX(
    rewardsAllowanceDHXDaily,
    minBondedDHXDailyCurrent,
  ) {
    // no reward today
    if (!hasMinBondedDhxRequiredDaily(minBondedDHXDailyCurrent)) {
      console.log('getDayRewardInDHX - insufficient bonded dhx daily')
      return 0;
    }

    let dailyReward = calcDayRewardInDHXBasedOnBondedDHX();
    if (dailyReward > rewardsAllowanceDHXDaily) {
        console.log('getDayRewardFromBondingInDHX - bonding reward cannot exceed daily DHX allowance')
        return 0;
    }

    return dailyReward;
  }

  addUserBondedDHXToHistoryForDate() {
    let date = Date.now();
    this.bondedDHXHistory[date] = {
      bondedDHX: this.bondedDHXCurrent,
      date: date,
    };
  }
}

class UserMPower extends User {
  mPowerHistory = {};

  constructor(userId) {
    super(userId);

    this.mPowerCurrent = 5;
  }

  hasMPower() {
    return this.mPowerCurrent > 0;
  }

  hasMinMPowerRequiredDaily(minMPowerDailyCurrent) {
    console.log('hasMinMPowerRequiredDaily: ', this.mPowerCurrent >= minMPowerDailyCurrent);
    return this.mPowerCurrent >= minMPowerDailyCurrent;
  }
  
  // WIP: calculating the mPower of an account on a day
  calcDayMPowerForAccount(dataHighwayPublicKey, userEthereumAddress) {
    // initialize
    let mPower = 0;
    let MB = 0;
    let MSB = 0;
    let MDB = 0;
  
    // Token Mining
  
    // for token MXC
    let tokenTheTokenCategoryAndRewardCategoryMultiplier = {};
    if (isLockContractOwner(userEthereumAddress)) {
        tokenTheTokenCategoryAndRewardCategoryMultiplier = getByTokenLockContractAddressTheTokenCategoryAndRewardCategoryMultiplier('0x456')
  
        // Mining Base (MB)
        if (tokenTheTokenCategoryAndRewardCategoryMultiplier.tokenERC20Amount > 0) {
            MB += tokenTheTokenCategoryAndRewardCategoryMultiplier.tokenERC20Amount * tokenTheTokenCategoryAndRewardCategoryMultiplier.rewardCategoryMultiplier;
        }
  
        // Mining Speed Bonus (MSB)
        MDB = getByTokenCategoryAndDurationTheMiningDurationBonus(1, 24)
        MSB = MDB;
    }
  
    // Hardware Mining
    // IGNORE Hardware for the moment
  
    // // TODO - replace with function to fetch this info
    // // customised by governance at any time
    // let deviceModelsSHM = {
    //     m2Pro: {
    //         v1: 500000, // SHM
    //     },
    // }
    // // count devices added by user
    // let deviceModelsCount = {
    //     m2Pro: {
    //         v1: 1
    //     },
    // }
  
    // let SHM = 0;
  
    // Object.keys(deviceModelsSHM).forEach(function(key) {
    //     console.log(key, deviceModelsSHM[key]);
  
    //     if (deviceModelsCount[key] > 0) {
    //         SHM += deviceModelsCount[key] * deviceModelsSHM[key];
    //     }
    // });
  
    // TODO
    // mPower = (MB * MSB) + MHB + SHM;
    mPower = MB * MSB; // Ignore hardware for the moment (i.e. ignore `+ MHB + SHM`)
  
    // saveMPowerForAccountOnDate(dataHighwayPublicKey, currentDate);
  
    return mPower;
  }
  
  calcDayRewardInDHXBasedOnMPower(
    mPowerDayTotalAllAccountsCurrent,
    rewardsAllowanceDHXDailyRemaining
  ) {
    // DHX per MPower available to be disitributed
    let dhxPerMPower = rewardsAllowanceDHXDailyRemaining / mPowerDayTotalAllAccountsCurrent
    let dayReward = this.mPowerCurrent * dhxPerMPower;
  
    console.log('dayReward based on mPower', dayReward);
    return dayReward;
  }
  
  getDayRewardFromMPowerInDHX(
    mPowerDayTotalAllAccountsCurrent,
    rewardsAllowanceDHXDailyRemaining,
    minMPowerDailyCurrent,
  ) {
    // insufficient mPower daily for account for DHX reward based on it
    if (!hasMinMPowerRequiredDaily(minMPowerDailyCurrent)) {
      console.log('getDayRewardFromMPowerInDHX - insufficient mPower for account daily')
      return 0;
    }

    let dailyReward = calcDayRewardInDHXBasedOnMPower(
        mPowerDayTotalAllAccountsCurrent,
        rewardsAllowanceDHXDailyRemaining
    );
    if (dailyReward > rewardsAllowanceDHXDailyRemaining) {
        console.log('getDayRewardFromMPowerInDHX - mPower reward cannot exceed daily DHX allowance')
        return 0;
    }

    return dailyReward;
  }

  addUserMPowerToHistoryForDate() {
    let date = Date.now();
    this.mPowerHistory[date] = {
      mPower: this.mPowerCurrent,
      date: date,
    };
  }

  // sum total mPower of all accounts
  //
  // TODO - we need this so we can calculate the reward proportion based on a
  // user's mPower. there could be thousands to process each day. maybe only
  // consider those that have registered their address somehow?
  static calcTotalMPowerToday() {
    let dateNow = Date.now();
    let totalMPowerToday = 0;
    for (var dateKey in this.mPowerHistory) {
      if (this.mPowerHistory.hasOwnProperty(dateNow) && dateKey == dateNow) {  
        totalMPowerToday += this.mPowerHistory[dateNow].mPower;
      }
    }
    return totalMPowerToday;
  }
}

class UserRewards extends User {
  rewardsDistributionHistory = {};

  constructor(userId) {
    super(userId);
  }

  addUserBondedDHXToDistributionHistoryForDate(rewardForBondedDHX) {
    let date = Date.now();
    this.rewardsDistributionHistory[date] = {
      rewardForMPower: this.rewardsDistributionHistory[date].rewardForMPower,
      rewardForBondedDHX: rewardForBondedDHX,
      date: date,
    };
  }

  addUserMPowerToDistributionHistoryForDate(rewardForMPower) {
    let date = Date.now();
    this.rewardsDistributionHistory[date] = {
      rewardForMPower: rewardForMPower,
      rewardForBondedDHX: this.rewardsDistributionHistory[date].rewardForBondedDHX,
      date: date,
    };
  }
}

let global = new Global();
global.addRewardsAllowanceDHXDailyToHistoryForDate();
console.log('global.rewardsAllowanceDHXDailyHistory: ', global.rewardsAllowanceDHXDailyHistory);

let globalMPowerSettings = GlobalMPowerSettings({
  minMPowerDailyDefault: 5,
  minMPowerDailyCurrent: 5,
});

let globalMPower = new GlobalMPower();
globalMPower.updateGlobalMPowerSettings(globalMPowerSettings);

// calculate total mPower of all users
let totalMPowerCurrent = UserMPower.calcTotalMPowerToday();
globalMPower.addTotalMPowerToHistoryForDate(totalMPowerCurrent)

let globalBondingSettings = new GlobalBondingSettings({
  intervalMultiplierEnabled: 1, // customised by governance at any time. should increase by multiplier at interval. (on == 1; off == 0)
  intervalMultiplierReset: 0, // customised by user at any time
  intervalMultiplierCurrent: 2, // customised by governance at any time or override automatically by multiplier. multiplier to increase min. bonded DHX required daily to DHX Mine after each interval
  intervalMultiplierDays: 5, // customised by governance at any time. days that we will use the current interval multplier value i.e. 10:1
  coolingOffPeriodDays: 7, // customised by governance at any time
  coolingOffDaysRemaining: 7,
  minBondedDHXDailyDefault: 10, // customised by governance at any time. initial min. bonded DHX required daily to DHX Mine during interval
  minBondedDHXDailyCurrent: 10,
});

let globalBonding = new GlobalBonding();
globalBonding.updateGlobalBondingSettings(globalBondingSettings);

let user1Bonding = new UserBonding('0x123');
console.log('user1Bonding.bondedDHXCurrent: ', user1Bonding.bondedDHXCurrent);
user1Bonding.addUserBondedDHXToHistoryForDate(globalBonding)
console.log('user1Bonding.bondedDHXHistory: ', user1Bonding.bondedDHXHistory);

let usersBondingCurrently = [user1Bonding];

let user1MPower = new UserMPower('0x123');
console.log('user1MPower.mPowerCurrent: ', user1MPower.mPowerCurrent);
user1MPower.mPowerCurrent = 5;
user1MPower.addUserMPowerToHistoryForDate();
console.log('user1MPower.mPowerHistory: ', user1MPower.mPowerHistory);

let usersMPowerCurrently = [user1MPower];

let userRewards = new UserRewards('0x123');
// let usersForRewards = [userRewards];

global.runOnFinalize(usersBondingCurrently, usersMPowerCurrently, userRewards, global, globalBonding, globalMPower);

console.log('userRewards.rewardsDistributionHistory: ', userRewards.rewardsDistributionHistory);

// TODO - repeat calling `global.runOnFinalize` to emulate multiple blocks after changing various parameters
// of the users (i.e. their bonded DHX or mPower, etc)

let contracts = new Contracts();
let user1EthereumAddress = '0x001';
let user1TokenLockContract1Data = {
  lockContractOwner: '0x001', // Ethereum address of lock smart contract
  lockContractAddress: '0x789', // Ethereum lock contract address
  dataHighwayPublicKey: '0x123', // DataHighway public key
  tokenName: 'mxc',
  tokenCategory: 1,
  tokenContractAddress: '0x456', // address of locked token type (i.e. MXC)
  tokenERC20Amount: 100, // amount of tokens locked
  rewardCategoryMultiplier: 1.0,
  lockReturn: 24, // lock duration
};
contracts.addTokenLockContractAddressMapping(user1TokenLockContract1Data);
let lockInfo = contracts.getByAccountTheLockInfo(user1EthereumAddress);
let isOwner = contracts.isLockContractOwner(lockInfo.lockContractAddress, user1EthereumAddress);
