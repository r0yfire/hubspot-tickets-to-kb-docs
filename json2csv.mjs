import fs from 'fs';
import {format} from '@fast-csv/format';

const csvStream = format({headers: true});
const jsonData = fs.readFileSync('output.json', 'utf8');
const data = JSON.parse(jsonData);
csvStream
    .pipe(fs.createWriteStream('output.csv'))
    .on('end', () => console.log('Done writing.'));
data.forEach((row) => {
    csvStream.write(row);
});
csvStream.end();