import fetch from 'node-fetch';

async function testAdminPage() {
  try {
    console.log('🔍 Testing admin login page...');
    
    const response = await fetch('http://localhost:3000/admin/login');
    const html = await response.text();
    
    console.log(`✅ Status: ${response.status}`);
    console.log(`📄 Content length: ${html.length} characters`);
    
    // Check for key elements
    const hasTitle = html.includes('Aantekeningen');
    const hasGoogleSignIn = html.includes('Google') || html.includes('Inloggen');
    const hasForm = html.includes('form') || html.includes('button');
    
    console.log(`\n📋 Content check:`);
    console.log(`   - Has title: ${hasTitle}`);
    console.log(`   - Has Google sign-in: ${hasGoogleSignIn}`);
    console.log(`   - Has form/button: ${hasForm}`);
    
    // Check for JavaScript errors
    const hasScripts = html.includes('<script');
    const hasNextJS = html.includes('_next');
    
    console.log(`\n🔧 Technical check:`);
    console.log(`   - Has scripts: ${hasScripts}`);
    console.log(`   - Has Next.js assets: ${hasNextJS}`);
    
    // Show first 500 characters
    console.log(`\n📝 First 500 characters:`);
    console.log(html.substring(0, 500));
    
  } catch (error) {
    console.error('❌ Error testing admin page:', error.message);
  }
}

testAdminPage();
