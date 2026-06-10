const fs = require('fs');
const content = fs.readFileSync('C:/Users/HP/OneDrive/Documents/2026/App_Proj/AJI/index.html', 'utf8');
const lines = content.split('\n');
let inFunc = false;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('authenticateUserGAS: function(username')) {
        inFunc = true;
    }
    if (inFunc) {
        console.log(lines[i]);
        if (lines[i].includes('},')) {
            break;
        }
    }
}
