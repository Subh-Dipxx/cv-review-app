const fs = require('fs');
const path = require('path');

const files = [
    'app/components/Navigation.js',
    'app/components/ClientWrapper.js',
    'app/components/ClientLayout.js',
    'app/register/page.js',
    'app/dashboard/page.js',
    'app/components/SessionExpired.js',
    'app/settings/page.js',
    'app/contact/page.js',
    'app/change-password/page.js',
    'app/components/AuthGuard.js',
    'app/login/page.js',
    'app/uploads/page.js',
    'app/profile/page.js'
];

files.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        content = content.replace(
            /from ["']\.\.\/context\/AuthContext["']/g,
            'from "../context"'
        );
        fs.writeFileSync(filePath, content);
    }
});
