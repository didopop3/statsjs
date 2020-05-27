const { jStat } = require('jstat');
const reducer = (accumulator, currentValue) => accumulator + currentValue;
const flattened = (arr) => [].concat(...arr);
// Compute the levene test
function leveneTest(samples) {
  // Compute N, the total number of observations
  // and p, the number of samples
  var p = samples.length;
  var N = samples.map((x) => x.length).reduce(reducer);
  var samplesT = samples.map((x) => {
    var medianX = jStat.median(x);
    return x.map((xi) => Math.abs(xi - medianX));
  });
  var z = jStat.mean(flattened(samplesT));

  var top =
    (N - p) *
    jStat.sum(
      samplesT.map((x) => {
        var m = x.length;
        return m * Math.pow(jStat.mean(x) - z, 2);
      })
    );
  var botton =
    (p - 1) *
    jStat.sum(
      samplesT.map((x) =>
        jStat.sum(x.map((xi) => Math.pow(xi - jStat.mean(x), 2)))
      )
    );
  var W = top / botton;

  var df1 = p - 1;
  var df2 = N - df1 - 1;

  // Return ratio
  return {
    fValue: W,
    pValue: 1 - jStat.centralF.cdf(W, df1, df2),
  };
}

function anovaTest(samples) {
  // Compute weights and ajusted means
  var p = samples.length;
  var N = samples.map((x) => x.length).reduce(reducer);

  var fValue = jStat.anovafscore(samples);
  var df1 = p - 1;
  var df2 = N - df1 - 1;

  return {
    fValue: fValue,
    pValue: 1 - jStat.centralF.cdf(fValue, df1, df2),
  };
}

function welchTest(samples) {
  // Compute weights and ajusted means
  var r = samples.length;
  var df1 = r - 1;

  var w = samples.map((d) => {
    var ni = d.length;
    var s2i = jStat.variance(d, true);
    return ni / s2i;
  });
  var wSum = jStat.sum(w);
  var adjW = jStat.sum(w.map((wi, i) => wi * jStat.mean(samples[i]))) / wSum;

  //  Sums of squares (regular and adjusted)

  var ss = jStat.sum(
    w.map((wi, i) => {
      return wi * Math.pow(jStat.mean(samples[i]) - adjW, 2);
    })
  );

  // Calculate lambda, F-value, p-value and np2

  var lbd =
    3 *
    (1 / (Math.pow(r, 2) - 1)) *
    jStat.sum(
      samples.map((d, i) => {
        var ni = d.length;
        return (1 / (ni - 1)) * Math.pow(1 - w[i] / wSum, 2);
      })
    );
  var fVaule = (ss / df1) * (1 / (1 + (2 * lbd * (r - 2)) / 3));
  var pVaule = 1 - jStat.centralF.cdf(fVaule, df1, 1 / lbd);

  return {
    fValue: fVaule,
    pValue: pVaule,
  };
}

// games-howell test
function GHTest(samples) {
  const averV = (s) => jStat.variance(s, true) / s.length;
  var groupList = samples.flatMap((v, i) =>
    samples.slice(i + 1).map((w) => [v, w])
  );

  var r = samples.length;

  return groupList.map((g) => {
    var tValue =
      (jStat.mean(g[0]) - jStat.mean(g[1])) /
      Math.sqrt(averV(g[0]) + averV(g[1]));
    var df =
      Math.pow(averV(g[0]) + averV(g[1]), 2) /
      (Math.pow(averV(g[0]), 2) / (g[0].length - 1) +
        Math.pow(averV(g[1]), 2) / (g[1].length - 1));
    var pValue = 1 - jStat.tukey.cdf(Math.sqrt(2) * Math.abs(tValue), r, df);
    return {
      tValue: tValue,
      pValue: pValue,
      reject: pValue > 0.05 ? false : true,
    };
  });
}

function multcompLetters(samples, compareR) {
  // input: input result is an array
  // limit: can use not more than 26 letter limit
  // sampels = ["X1","X2", "X3", "X4","X5"]
  var r = samples.length;
  // var result = [true, false, true,...]
  // convert it to [{col1: X1, col2: X2, col3: true}, {col1: X1, col2: X3, col3:false},,...}]
  // create new result with position
  var m = 0;
  var result = samples.flatMap((vali, indi) => {
    return samples.slice(indi + 1).map((valj) => {
      var v = { col1: vali, col2: valj, col3: compareR[m] };
      m = m + 1;
      return v;
    });
  });
  var z = 0;
  var letters = [...Array(r)].reduce(
    (a) => a + String.fromCharCode(z++),
    '',
    (z = 97)
  );
  var initR = letters.split('');
  var marker = Array.from(initR);
  samples.forEach((vali, indi) => {
    var y = marker[indi];
    samples.slice(indi + 1).forEach((valj, indj) => {
      var reject = result.filter((x) => x.col1 === vali && x.col2 === valj)[0][
        'col3'
      ];
      if (!reject) {
        // if false, append the new char to the given char unless there is a false link,

        var n_reject = result.filter((x) => x.col2 === vali && x.col3 === true);
        var newChar = initR[samples.indexOf(valj)];
        // check false link, see if any conflict with previous result
        if (n_reject.length > 0) {
          // if there is, then the found element with the current element, they can't share the same char, so
          // the char can't be add to the current element but has to be add to the other one in the pair
          var falseCharList = n_reject.map((x) => x.col1);
          var isFalseEl = falseCharList.map((x) => marker[samples.indexOf(x)]);
          if (isFalseEl.some((e) => e.includes(newChar))) {
            marker[samples.indexOf(valj)] =
              marker[samples.indexOf(valj)] + initR[samples.indexOf(vali)];
          } else {
            y = y + newChar;
          }
        } else {
          y = y + newChar;
        }
      }
    });

    marker[indi] = y;
  });

  marker = marker.map((e) => {
    var a = new Set(e.split('').sort());
    return [...a].join('');
  });

  // simplify the result
  // get the char needs to be replaced
  var rmList = [];
  initR.forEach((char, ind) => {
    var markerWithChar = marker.filter((m) => m.includes(char));
    if (markerWithChar.length === 1) {
      if (markerWithChar[0].length > 1) {
        //  remove char from marker, because it doesn't bring new info
        rmList.push(char);
      }
    } else {
      //  remove char if char is convered by other letter
      var checkLetterList = initR.slice(ind + 1);
      checkLetterList.some((c) => {
        var isCovered = markerWithChar.every((m) => m.includes(c));
        if (isCovered) {
          rmList.push(char);
          return true;
        }
        return true;
      });
    }
  });

  // remove the chars from marker
  var simpleMarker = marker.map((e) => {
    rmList.forEach((m) => {
      var re = new RegExp(m, 'g');
      e = e.replace(re, '');
    });
    return e;
  });

  // change those letter to replace those deleted ones

  var charNewPostion = {};
  initR.forEach((e) => {
    var n = 0;
    rmList.forEach((m) => {
      if (e > m) {
        n = n + 1;
      }
    });
    charNewPostion[e] = n;
  });

  var finalMarker = simpleMarker.map((m, i) => {
    initR.forEach((val, ind) => {
      var re = new RegExp(val, 'g');

      m = m.replace(re, initR[ind - charNewPostion[val]]);
    });
    return m;
  });
  return finalMarker;
}

function statsTest(samples, name) {
  let lResult = leveneTest(samples).pValue;

  if (lResult)
    if (lResult > 0.05) {
      let aResult = anovaTest(samples).pValue;
      if (aResult > 0.5) {
        return ['a', 'a', 'a', 'a'];
      } else {
        var tukeyResult = jStat.tukeyhsd(samples);
        return multcompLetters(
          name,
          tukeyResult.map((t) => t[1] <= 0.05)
        );
      }
    } else {
      let wResult = welchTest(samples).pValue;
      if (wResult > 0.5) {
        return ['a', 'a', 'a', 'a'];
      } else {
        var GHResult = GHTest(samples);
        return multcompLetters(
          name,
          GHResult.map((gh) => gh.reject)
        );
      }
    }
  else {
    return Array(name.length).fill('NaN');
  }
}

function correlationPValue(r, n) {
  var newR = 0.5 * (1 - r);
  var ab = n / 2 - 1;
  return 2 * jStat.beta.cdf(newR, ab, ab);
}
// usage example

// statsTest(
//   [
//     [62, 60, 71, 55, 48],
//     [32, 39, 51, 30, 35],
//     [63, 57, 52, 41, 43],
//     [42, 50, 41, 37],
//   ],
//   ['X1', 'X2', 'X3', 'X4']
// )
