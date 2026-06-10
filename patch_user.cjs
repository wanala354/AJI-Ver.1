const fs = require('fs');

const filePath = 'C:/Users/HP/OneDrive/Documents/2026/App_Proj/AJI/index.html';
let content = fs.readFileSync(filePath, 'utf8');

const target = `        const isEdit = data && data.length > 0;
        return supabaseClient.from("app_users").upsert(pgUser).then(({ error }) => {`;

const replacement = `        const isEdit = data && data.length > 0;
        let req;
        if (isEdit) {
            req = supabaseClient.from("app_users").update(pgUser).eq("username", pgUser.username);
        } else {
            req = supabaseClient.from("app_users").insert([pgUser]);
        }
        return req.then(({ error }) => {`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Replaced successfully!');
} else {
    console.log('Target not found!');
}
