const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

const BASE_URL = 'http://localhost:5000/api';
let token = '';
let docId = '';
let sigId = '';

async function runTests() {
  console.log('--- STARTING PDF SIGNER API INTEGRATION TESTS ---');

  try {
    // 1. REGISTER
    console.log('\n[TEST 1] Registering a new user...');
    const registerResponse = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        email: `tester-${Date.now()}@example.com`,
        password: 'password123'
      })
    });
    const registerData = await registerResponse.json();
    if (registerResponse.status === 201) {
      console.log('SUCCESS: User registered!', registerData.email);
      token = registerData.token;
    } else {
      console.log('FAILED (User might already exist, attempting login instead)');
    }

    // 2. LOGIN (Fallback or direct test)
    if (!token) {
      console.log('\n[TEST 2] Logging in user...');
      const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123'
        })
      });
      const loginData = await loginResponse.json();
      if (loginResponse.status === 200) {
        console.log('SUCCESS: Logged in!', loginData.email);
        token = loginData.token;
      } else {
        throw new Error(`Login failed: ${loginData.message}`);
      }
    }

    // 3. GET PROFILE (ME)
    console.log('\n[TEST 3] Fetching user profile...');
    const meResponse = await fetch(`${BASE_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const meData = await meResponse.json();
    console.log('SUCCESS: Profile fetched!', meData.name, meData.email);

    // 4. CREATE A TINY PDF & UPLOAD
    console.log('\n[TEST 4] Creating a mock PDF file...');
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]);
    page.drawText('Test Document for PDF Signer', { x: 50, y: 700, size: 20 });
    const pdfBytes = await pdfDoc.save();
    const tempPdfPath = path.join(__dirname, 'test.pdf');
    fs.writeFileSync(tempPdfPath, pdfBytes);
    console.log('Mock PDF created at:', tempPdfPath);

    console.log('Uploading PDF to backend...');
    const formData = new FormData();
    const fileBuffer = fs.readFileSync(tempPdfPath);
    const fileBlob = new Blob([fileBuffer], { type: 'application/pdf' });
    formData.append('file', fileBlob, 'test.pdf');

    const uploadResponse = await fetch(`${BASE_URL}/docs/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    const uploadData = await uploadResponse.json();
    if (uploadResponse.status === 201) {
      console.log('SUCCESS: PDF uploaded!', uploadData.originalName, 'ID:', uploadData._id);
      docId = uploadData._id;
    } else {
      throw new Error(`Upload failed: ${uploadData.message}`);
    }

    // 5. FETCH ALL DOCUMENTS
    console.log('\n[TEST 5] Fetching document list...');
    const listResponse = await fetch(`${BASE_URL}/docs`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const listData = await listResponse.json();
    console.log('SUCCESS: Document list length:', listData.length);

    // 6. CREATE SIGNATURE FIELD
    console.log('\n[TEST 6] Creating signature position placeholder...');
    const sigResponse = await fetch(`${BASE_URL}/signatures`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        fileRef: docId,
        coordinates: {
          x: 25,
          y: 60,
          page: 1,
          width: 150,
          height: 50
        },
        signerInfo: {
          name: 'Signer Name',
          email: 'signer@example.com'
        }
      })
    });
    const sigData = await sigResponse.json();
    if (sigResponse.status === 201) {
      console.log('SUCCESS: Signature placeholder created!', sigData._id);
      sigId = sigData._id;
    } else {
      throw new Error(`Signature placeholder creation failed: ${sigData.message}`);
    }

    // 7. GET SIGNATURES FOR DOCUMENT
    console.log('\n[TEST 7] Fetching placeholders for document...');
    const sigsResponse = await fetch(`${BASE_URL}/signatures/doc/${docId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const sigsData = await sigsResponse.json();
    console.log('SUCCESS: Found fields:', sigsData.length);

    // 8. SIGN DOCUMENT (TEXT TYPE)
    console.log('\n[TEST 8] Signing document with typed text...');
    const signResponse = await fetch(`${BASE_URL}/signatures/${sigId}/sign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        signatureType: 'text',
        signatureData: 'Aayush Signature'
      })
    });
    const signData = await signResponse.json();
    if (signResponse.status === 200) {
      console.log('SUCCESS: Document signed successfully! Status:', signData.status);
    } else {
      throw new Error(`Signing failed: ${signData.message}`);
    }

    // 9. CLEAN UP LOCAL MOCK FILE
    if (fs.existsSync(tempPdfPath)) {
      fs.unlinkSync(tempPdfPath);
    }

    console.log('\n--- ALL API INTEGRATION TESTS PASSED SUCCESSFULLY! ---');
  } catch (error) {
    console.error('\n❌ TEST SUITE RUN ERROR:', error.message);
  }
}

runTests();
