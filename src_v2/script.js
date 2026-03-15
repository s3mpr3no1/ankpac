// Card schema: front, back, interval (0), repetition (0), ease (2.5), dueDate (1/1/2000)

var DEFAULT_DUE_DATE = new Date(2000, 0, 1).getTime();

function parseCSVToCards(csvText) {
  var lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  var headers = parseCSVLine(lines[0]);
  var headersLower = headers.map(function (h) { return (h || '').toLowerCase(); });
  var frontIdx = headersLower.indexOf('front');
  var backIdx = headersLower.indexOf('back');
  var intervalIdx = headersLower.indexOf('interval');
  var repetitionIdx = headersLower.indexOf('repetition');
  var easeIdx = headersLower.indexOf('ease');
  var dueDateIdx = headersLower.indexOf('duedate');
  if (frontIdx === -1 || backIdx === -1) return [];
  var cards = [];
  for (var i = 1; i < lines.length; i++) {
    var values = parseCSVLine(lines[i]);
    if (values[frontIdx] === undefined && values[backIdx] === undefined) continue;
    cards.push({
      front: values[frontIdx] || '',
      back: values[backIdx] || '',
      interval: parseNum(values[intervalIdx], 0),
      repetition: parseNum(values[repetitionIdx], 0),
      ease: parseNum(values[easeIdx], 2.5),
      dueDate: parseNum(values[dueDateIdx], DEFAULT_DUE_DATE)
    });
  }
  return cards;
}

function parseCSVLine(line) {
  var out = [];
  var i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      var end = i + 1;
      var s = '';
      while (end < line.length) {
        if (line[end] === '"') {
          if (line[end + 1] === '"') {
            s += '"';
            end += 2;
          } else {
            end++;
            break;
          }
        } else {
          s += line[end];
          end++;
        }
      }
      out.push(s);
      i = line[end] === ',' ? end + 1 : end;
    } else {
      var comma = line.indexOf(',', i);
      if (comma === -1) {
        out.push(line.slice(i).trim());
        break;
      }
      out.push(line.slice(i, comma).trim());
      i = comma + 1;
    }
  }
  return out;
}

function parseNum(val, defaultVal) {
  if (val === undefined || val === '') return defaultVal;
  var n = Number(val);
  return isNaN(n) ? defaultVal : n;
}

// initial values: interval=0, repetition=0, ease=2.5
// item: SuperMemoItem
// grade: 0-5
// returns {interval, repetition, ease}

function supermemo(interval, repetition, ease, grade) {
   

    if (grade >= 3) {
        if (repetition === 0) {
            interval = 1;
        } else if (repetition === 1) {
            interval = 6;
        } else {
            interval = Math.round(interval * ease);
        }

        repetition += 1;
    } else {
        repetition = 0; 
        interval = 1
    }

    ease = ease + (0.1 - ( 5 - grade) * (0.08 + (5 - grade) * 0.02));

    if (ease < 1.3) {
        ease = 1.3;
    }

    return {
        interval,
        repetition,
        ease
    };
}

