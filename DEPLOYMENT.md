# Chatbot Deployment Instructions

## Overview
This chatbot application requires separate deployment for frontend and backend due to Netlify's static hosting limitations.

## Option 1: Split Deployment (Recommended)

### Frontend Deployment (Netlify)

1. **Prepare Frontend Files**
   - Create a new repository with only frontend files
   - Include: `index.html`, `style.css`, `script.js`, `img/`, `NoticBoard/`, `signUpPage/`, `aboutme/`, `location/`
   - Exclude: `server/`, `node_modules/`, `package.json`, `package-lock.json`

2. **Update API URLs**
   - In `script.js` and `NoticBoard/Notic.js`, replace `"https://your-backend-url.railway.app"` with your actual backend URL

3. **Deploy to Netlify**
   - Go to [netlify.com](https://netlify.com)
   - Sign up/Login with GitHub
   - Click "New site from Git"
   - Connect your frontend repository
   - Build settings: Leave empty (static site)
   - Publish directory: `.` (root)
   - Deploy

### Backend Deployment (Railway - Recommended)

1. **Prepare Backend**
   - Create a new repository with backend files
   - Include: `server/` folder contents
   - Add `server/package.json` with dependencies

2. **Deploy to Railway**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your backend repository
   - Set root directory to `server/`

3. **Configure Environment Variables**
   - In Railway dashboard, go to your project → Variables
   - Add these variables:
     ```
     DB_HOST=your-mysql-host
     DB_USER=your-mysql-user
     DB_PASSWORD=your-mysql-password
     DB_NAME=your-mysql-database
     JWT_SECRET=your-secret-key
     ```

4. **Database Setup**
   - Use Railway's MySQL plugin or external MySQL service
   - Run the SQL from `database/setup.sql` to create tables

5. **Get Backend URL**
   - Railway will provide a URL like: `https://your-app.railway.app`
   - Update frontend files with this URL

## Option 2: Full-Stack Deployment (Alternative)

### Railway (Recommended for Full-Stack)

1. **Prepare Repository**
   - Keep all files in one repository
   - Update `package.json` to include both frontend and backend dependencies

2. **Deploy to Railway**
   - Connect your full repository
   - Set root directory to `.` (root)
   - Railway will detect Node.js and deploy

3. **Configure Environment Variables**
   - Same as above

### Render (Alternative)

1. **Create Render Account**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub

2. **Deploy Web Service**
   - New → Web Service
   - Connect your repository
   - Build Command: `npm install`
   - Start Command: `node server/server.js`

3. **Configure Environment Variables**
   - Same as Railway

## Database Options

### 1. Railway MySQL (Easiest)
- Add MySQL plugin in Railway
- Automatic environment variables

### 2. PlanetScale (Recommended)
- Free MySQL-compatible database
- Go to [planetscale.com](https://planetscale.com)
- Create database
- Get connection string

### 3. External MySQL
- Use any MySQL hosting service
- Update environment variables

## File Upload Storage

### Option 1: Local Storage (Not Recommended for Production)
- Files stored on server
- Will be lost on server restart

### Option 2: Cloud Storage (Recommended)
- Use AWS S3, Cloudinary, or similar
- Update upload logic to use cloud storage

## Security Considerations

1. **Environment Variables**
   - Never commit secrets to Git
   - Use environment variables for all sensitive data

2. **CORS Configuration**
   - Update CORS to allow only your frontend domain
   - Remove `origin: "*"` in production

3. **JWT Secret**
   - Use a strong, random secret
   - Store in environment variables

## Troubleshooting

### Common Issues:

1. **CORS Errors**
   - Check CORS configuration
   - Ensure frontend URL is allowed

2. **Database Connection**
   - Verify environment variables
   - Check database credentials

3. **File Uploads**
   - Ensure upload directory exists
   - Check file permissions

4. **API Endpoints Not Found**
   - Verify backend URL in frontend
   - Check server routes

## Final Steps

1. **Test Everything**
   - Test login/signup
   - Test file uploads
   - Test notice board
   - Test chat functionality

2. **Update Documentation**
   - Update any hardcoded URLs
   - Document deployment process

3. **Monitor**
   - Set up logging
   - Monitor errors
   - Check performance 