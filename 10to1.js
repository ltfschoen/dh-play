function getNextMinBondedDhxRequiredDaily(
  resetToDefaultMultiplier,
  defaultMinBondedDhxRequiredDaily,
  currentMinBondedDhxRequiredDaily,
  isIntervalMultiplierOn,
  currentIntervalMultiplier,
  remainingIntervalDays,
) {
  let nextMinBondedDhxRequiredDaily;
  if (resetToDefaultMultiplier) {
      nextMinBondedDhxRequiredDaily = defaultMinBondedDhxRequiredDaily;
  }

  if (isIntervalMultiplierOn) {
      if (remainingIntervalDays == 0) {
          // double at and of interval when turned on and until reset
          nextMinBondedDhxRequiredDaily =
              currentMinBondedDhxRequiredDaily * currentIntervalMultiplier;
      } else {
          nextMinBondedDhxRequiredDaily =
              currentMinBondedDhxRequiredDaily;
      }
  } else {
      nextMinBondedDhxRequiredDaily = currentMinBondedDhxRequiredDaily;
  }

  return nextMinBondedDhxRequiredDaily;
}

function shouldStartNextInterval(remainingIntervalDays) {
  if (remainingIntervalDays == 0) {
      console.log('shouldStartNextInterval', true);
      return true;
  }
  console.log('shouldStartNextInterval', false);
  return false;
}

function hasMinBondedDhxRequiredDaily(bondedDHXCurrent, currentMinBondedDhxRequiredDaily) {
  console.log('hasMinBondedDhxRequiredDaily: ', bondedDHXCurrent >= currentMinBondedDhxRequiredDaily);
  return bondedDHXCurrent >= currentMinBondedDhxRequiredDaily;
}

function calcDayRewardInDHXBasedOnBondedDHX(bondedDHXCurrent) {
  console.log('calcDayRewardInDHXBasedOnBondedDHX: ', 1 / bondedDHXCurrent)
  return 1 / bondedDHXCurrent;
}

function getDayRewardInDHX(
  bondedDHXCurrent,
  currentMinBondedDhxRequiredDaily,
) {
  // no reward today
  if (!hasMinBondedDhxRequiredDaily(bondedDHXCurrent, currentMinBondedDhxRequiredDaily)) {
      console.log('getDayRewardInDHX - insufficient bonded dhx daily')
      return 0;
  }

  return calcDayRewardInDHXBasedOnBondedDHX(bondedDHXCurrent);
}

function appendDayRewardFromBondingInDHX(
  bondedDHXCurrent,
  currentRewardsFromBonding,
  currentMinBondedDhxRequiredDaily,
  dhxAllowanceDaily,
) {
  let updatedRewardsFromBonding = currentRewardsFromBonding;

  let dailyReward = getDayRewardInDHX(bondedDHXCurrent, currentMinBondedDhxRequiredDaily);
  if (dailyReward > dhxAllowanceDaily) {
      console.log('appendDayRewardFromBondingInDHX - bonding reward cannot exceed daily DHX allowance')
      return updatedRewardsFromBonding;
  }
  updatedRewardsFromBonding.push(dailyReward);
  console.log('appendDayRewardFromBondingInDHX - updatedRewardsFromBonding: ', updatedRewardsFromBonding)

  return updatedRewardsFromBonding;
}

/// ON-FINALIZE BLOCK LOOP THAT REPEATS DAILY
function run(params){
  let remainingIntervalDays = params.intervalDays;  // updated by below
  let currentMinBondedDhxRequiredDaily = params.currentMinBondedDhxRequiredDaily || params.defaultMinBondedDhxRequiredDaily; // updated by below
  let currentMinMPowerRequiredDaily = params.currentMinMPowerRequiredDaily || params.defaultMinMPowerRequiredDaily;
  let remainingCoolingOffDays = params.remainingCoolingOffDays || params.coolingOffPeriodDays;  // updated by below
  let currentRewardsFromBonding = params.currentRewardsFromBonding;        // updated below
  let currentRewardsFromMPower = params.currentRewardsFromMPower;        // updated below

  remainingIntervalDays = remainingIntervalDays - 1;

  let startNextInterval = shouldStartNextInterval(remainingIntervalDays);
  if (startNextInterval) {
      remainingIntervalDays = params.intervalDays;
      // TODO - store updated `remainingIntervalDays` in state
  }

  currentMinBondedDhxRequiredDaily = getNextMinBondedDhxRequiredDaily(
      params.resetToDefaultMultiplier,
      params.defaultMinBondedDhxRequiredDaily,
      currentMinBondedDhxRequiredDaily,
      params.isIntervalMultiplierOn,
      params.currentIntervalMultiplier,
      remainingIntervalDays
  );
  console.log('currentMinBondedDhxRequiredDaily: ', currentMinBondedDhxRequiredDaily);
  // TODO - store updated `currentMinBondedDhxRequiredDaily` in storage

  console.log('bondedDHXCurrent', params.bondedDHXCurrent)

  // Rewards Part 1/2 - Bonded DHX
  // note: since combined rewards = bonding rewards + mPower rewards
  // TODO - this is account-specific, pass the account as a parameter
  currentRewardsFromBonding = appendDayRewardFromBondingInDHX(
      params.bondedDHXCurrent,
      currentRewardsFromBonding,
      currentMinBondedDhxRequiredDaily,
      params.dhxAllowanceDaily,
  );
  console.log('currentRewardsFromBonding', currentRewardsFromBonding);

  // TODO - store latest `currentRewardsFromBonding` in state

  // combination of rewards include:
  // - bonding
  // - mPower

  // Rewards Part 2/2 - mPower DHX

  // TODO
  // - get the daily DHX reward allowance (or remaining)
  //     we've just calculated the proportion of bonding rewards,
  //     now we calculate the remaining dhx that we have from the
  //     dhx daily allowance that we can still use for mPower rewards
  let lengthCurrentRewardsFromBonding = currentRewardsFromBonding.length;
  let lastElem = currentRewardsFromBonding[lengthCurrentRewardsFromBonding-1];
  let remainingDHXAllowanceDaily = params.dhxAllowanceDaily - lastElem;

  // - calc. DHX reward per mPower based on the total mPower of all accounts
  currentRewardsFromMPower = appendDayRewardFromMPowerInDHX(
      params.mPowerForAccountCurrent,
      currentRewardsFromMPower,
      currentMinMPowerRequiredDaily,
      remainingDHXAllowanceDaily,
      params.totalDayMPowerAllAccountsCurrent,
  );
  console.log('currentRewardsFromMPower', currentRewardsFromMPower);

  remainingCoolingOffDays = remainingCoolingOffDays - 1;
  console.log('remainingCoolingOffDays: ', remainingCoolingOffDays);

  console.log('remainingCoolingOffDays', remainingCoolingOffDays);
  if (remainingCoolingOffDays == 0) {
      // TODO - distribute rewards after check if ready to distribute rewards
  }

  return {
      remainingIntervalDays,
      currentMinBondedDhxRequiredDaily,
      currentMinMPowerRequiredDaily,
      remainingCoolingOffDays,
      currentRewardsFromBonding,
      currentRewardsFromMPower,
  };
}

function updateParams(res, params) {
  params.remainingIntervalDays = res.remainingIntervalDays;
  params.currentMinBondedDhxRequiredDaily = res.currentMinBondedDhxRequiredDaily;
  params.currentMinMPowerRequiredDaily = res.currentMinMPowerRequiredDaily;
  params.remainingCoolingOffDays = res.remainingCoolingOffDays;
  params.currentRewardsFromBonding = res.currentRewardsFromBonding;
  params.currentRewardsFromMPower = res.currentRewardsFromMPower;
  return params;
}

// function getByAccountTheLockInfo() {
//     return {
//         lockContractOwner: 0x001,        // Ethereum address of lock smart contract
//         lockContractAddress: 0x789,      // Ethereum lock contract address
//         dataHighwayPublicKey: 0x123,     // DataHighway public key
//         tokenContractAddress: 0x456,     // address of locked token type (i.e. MXC)
//         tokenERC20Amount: 100,           // amount of tokens locked
//         lockReturn: 24,                  // lock duration
//     };
// }

function isLockContractOwner(tokenAddress, userEthereumAddress) {
  if (tokenAddress.lockContractOwner !== userEthereumAddress) {
      // calling user was found not to be the owner of the tokenContractAddress
      return false;
  }
  return true;
}

function getByTokenTheTokenCategoryAndRewardCategoryMultiplier(tokenAddress, userEthereumAddress) {
  // customised by governance at any time
  let tokenAddressMappings = {
      // tokenContractAddress
      '0x456': {
          lockContractOwner: '0x001',
          dataHighwayPublicKey: '0x123',
          tokenName: 'mxc',
          tokenCategory: 1,
          tokenContractAddress: '0x456',
          tokenERC20Amount: 100,
          rewardCategoryMultiplier: 1.0,
          lockReturn: 24,
      }
  };

  let res = {};

  let isOwner = isLockContractOwner(tokenAddressMappings[tokenAddress], userEthereumAddress);
  if (!isOwner) {
      return res;
  }

  Object.keys(tokenAddressMappings).forEach(function(key) {
      console.log(key, tokenAddressMappings[key]);

      if (tokenAddress == key) {
          res = tokenAddressMappings[key];
      }
  });

  return res;
}

function getByTokenCategoryAndDurationTheMiningDurationBonus(tokenCategory, duration) {
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

function hasMinMPowerRequiredDaily(mPowerCurrentForAccount, currentMinMPowerRequiredDaily) {
  console.log('hasMinMPowerRequiredDaily: ', mPowerCurrentForAccount >= currentMinMPowerRequiredDaily);
  return mPowerCurrentForAccount >= currentMinMPowerRequiredDaily;
}

// calculating the mPower of an account on a day
function calcDayMPowerForAccount(dataHighwayPublicKey, userEthereumAddress) {
  // initialize
  let mPower = 0;
  let MB = 0;
  let MSB = 0;
  let MDB = 0;

  // Token Mining

  // for token MXC
  let tokenTheTokenCategoryAndRewardCategoryMultiplier = {};
  if (isLockContractOwner(userEthereumAddress)) {
      tokenTheTokenCategoryAndRewardCategoryMultiplier = getByTokenTheTokenCategoryAndRewardCategoryMultiplier('0x456')

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

function calcDayRewardInDHXBasedOnMPower(
  mPowerForAccountCurrent,
  totalDayMPowerAllAccountsCurrent,
  remainingDHXAllowanceDaily
) {
  console.log('calcDayRewardInDHXBasedOnMPower: ', mPowerForAccountCurrent);
  // DHX per MPower available to be disitributed
  let dhxPerMPower = remainingDHXAllowanceDaily / totalDayMPowerAllAccountsCurrent
  let dayReward = mPowerForAccountCurrent * dhxPerMPower;

  console.log('dayReward based on mPower', dayReward);
  return dayReward;
}

function getDayRewardInDHXForMPower(
  mPowerForAccountCurrent,
  currentMinMPowerRequiredDaily,
  totalDayMPowerAllAccountsCurrent,
  remainingDHXAllowanceDaily
) {
  // insufficient mPower daily for account for DHX reward based on it
  if (!hasMinMPowerRequiredDaily(mPowerForAccountCurrent, currentMinMPowerRequiredDaily)) {
      console.log('getDayRewardInDHXForMPower - insufficient mPower for account daily')
      return 0;
  }

  return calcDayRewardInDHXBasedOnMPower(
      mPowerForAccountCurrent,
      totalDayMPowerAllAccountsCurrent,
      remainingDHXAllowanceDaily
  );
}

function appendDayRewardFromMPowerInDHX(
  mPowerForAccountCurrent,
  currentRewardsFromMPower,
  currentMinMPowerRequiredDaily,
  remainingDHXAllowanceDaily,
  totalDayMPowerAllAccountsCurrent,
) {
  let updatedRewardsFromMPower = currentRewardsFromMPower;

  let dailyReward = getDayRewardInDHXForMPower(
      mPowerForAccountCurrent,
      // currentRewardsFromMPower,
      currentMinMPowerRequiredDaily,
      totalDayMPowerAllAccountsCurrent,
      remainingDHXAllowanceDaily
  );
  if (dailyReward > remainingDHXAllowanceDaily) {
      console.log('appendDayRewardFromMPowerInDHX - mPower reward cannot exceed daily DHX allowance')
      return updatedRewardsFromMPower;
  }
  updatedRewardsFromMPower.push(dailyReward);
  console.log('appendDayRewardFromMPowerInDHX - updatedRewardsFromMPower: ', updatedRewardsFromMPower)

  return updatedRewardsFromMPower;
}

// - sum total mPower of all accounts
//   - TODO - how are we going to do this, there could be thousands to process each day.
//   -        but note that a proportion of the mPower
//   -        maybe only those that have 'registered' their address somehow so we know we need to consider them
function getDayTotalMPowerAllAccounts() {
  return 5000000; // this value is made up
}

// function saveMPowerForAccountOnDate(dataHighwayPublicKey, currentDate) {
//     let mPowerForAccountOnDate = {
//         [currentDate]: {
//             dataHighwayPublicKey:,
//             mPower: ,
//         }
//     };
// }

let params = {
  bondedDHXCurrent: 20,      // customised by user at any time.
  mPowerForAccountCurrent: 5,
  isIntervalMultiplierOn: 1, // customised by governance at any time. should increase by multiplier at interval. (on == 1; off == 0)
  currentIntervalMultiplier: 2, // customised by governance at any time or override automatically by multiplier. multiplier to increase min. bonded DHX required daily to DHX Mine after each interval
  intervalDays: 5,              // customised by governance at any time
  defaultMinBondedDhxRequiredDaily: 10, // customised by governance at any time. initial min. bonded DHX required daily to DHX Mine during interval
  currentMinBondedDhxRequiredDaily: 10,
  // TODO
  defaultMinMPowerRequiredDaily: 5,
  currentMinMPowerRequiredDaily: 5,
  coolingOffPeriodDays: 7,    // customised by governance at any time
  remainingCoolingOffDays: 7,
  resetToDefaultMultiplier: 0, // customised by user at any time
  // https://docs.google.com/spreadsheets/d/1W2AzOH9Cs9oCR8UYfYCbpmd9X7hp-USbYXL7AuwMY_Q/edit#gid=970997021
  dhxAllowanceDaily: 5000, // customised by governance at any time. this changes each year
  // currentMPowerForPerAccountOnDate: {},
  currentRewardsFromBonding: [],
  currentRewardsFromMPower: [],
  totalDayMPowerAllAccountsCurrent: getDayTotalMPowerAllAccounts()
}
let res;

// round 1
res = run(params);
params = updateParams(res, params);

// round 2
// new params
params.bondedDHXCurrent = 30;
// params.mPowerForAccountCurrent = calcDayMPowerForAccount('0x123', '0x001');
res = run(params);
params = updateParams(res, params);

// amountToMine*70 = bondedDhxRequired
// amountToDHXMine (i.e. 7 DHX) = nextMinBondedDhxRequiredDaily * durationInDays (7) / bondedDhxRequiredDailyDuringInterval
