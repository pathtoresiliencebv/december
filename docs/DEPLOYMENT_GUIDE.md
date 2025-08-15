# December AI Builder - Deployment Guide

## Overview
This guide walks you through deploying December AI Builder to Railway (backend) and Vercel (frontend).

## Prerequisites
- GitHub account
- Railway account (https://railway.app)
- Vercel account (https://vercel.com)
- Docker installed locally (for testing)

## Phase 1: Railway Backend Deployment

### Step 1: Create Railway Project
1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Connect your GitHub account
5. Select the `december` repository
6. Choose the `backend` directory as the source

### Step 2: Add PostgreSQL Database
1. In your Railway project, click "New"
2. Select "Database" → "PostgreSQL"
3. Wait for the database to be provisioned
4. Copy the `DATABASE_URL` from the database variables

### Step 3: Configure Environment Variables
In your Railway project settings, add these environment variables:

```env
# Database
DATABASE_URL=postgresql://username:password@host:port/database

# AI Configuration (from your config.ts)
OPENAI_API_KEY=your-openai-api-key
OPENAI_BASE_URL=https://openrouter.ai/api/v1
OPENAI_MODEL=anthropic/claude-sonnet-4

# CORS (will be updated after Vercel deployment)
CORS_ORIGIN=https://your-app.vercel.app

# Security
JWT_SECRET=your-secret-key-here
NODE_ENV=production
```

### Step 4: Deploy Backend
1. Railway will automatically detect the `railway.json` configuration
2. The build process will install dependencies and start the server
3. Monitor the deployment logs for any errors
4. Once deployed, copy the Railway app URL (e.g., `https://your-app.railway.app`)

### Step 5: Test Backend
1. Visit `https://your-app.railway.app/health`
2. You should see a JSON response with database status
3. If database shows "disconnected", check your `DATABASE_URL`

## Phase 2: Vercel Frontend Deployment

### Step 1: Create Vercel Project
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Select the `frontend` directory as the root directory
5. Configure the project settings:
   - Framework Preset: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

### Step 2: Configure Environment Variables
In your Vercel project settings, add these environment variables:

```env
# API Configuration
NEXT_PUBLIC_API_URL=https://your-app.railway.app
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

# Build Configuration
NODE_ENV=production
```

### Step 3: Deploy Frontend
1. Click "Deploy"
2. Vercel will build and deploy your Next.js application
3. Once deployed, you'll get a URL like `https://your-app.vercel.app`

### Step 4: Update CORS Origin
1. Go back to your Railway project
2. Update the `CORS_ORIGIN` environment variable:
   ```env
   CORS_ORIGIN=https://your-app.vercel.app
   ```
3. Redeploy the backend to apply the changes

## Phase 3: Testing and Verification

### Step 1: Test Frontend-Backend Communication
1. Visit your Vercel app URL
2. Try creating a new project
3. Check the browser console for any CORS errors
4. Verify that containers are being created in Railway

### Step 2: Test Database Functionality
1. Create a few test projects
2. Check the Railway PostgreSQL database to verify data is being stored
3. Test chat functionality to ensure messages are persisted

### Step 3: Monitor Logs
1. Check Railway logs for backend errors
2. Check Vercel logs for frontend errors
3. Monitor database connection status

## Troubleshooting

### Common Issues

#### Backend Won't Start
- Check Railway logs for error messages
- Verify `DATABASE_URL` is correct
- Ensure all environment variables are set

#### CORS Errors
- Verify `CORS_ORIGIN` matches your Vercel URL exactly
- Check that the backend is redeployed after CORS changes
- Ensure the frontend is using the correct API URL

#### Database Connection Issues
- Verify PostgreSQL is running in Railway
- Check `DATABASE_URL` format
- Ensure database tables are created (should happen automatically)

#### Frontend Build Errors
- Check Vercel build logs
- Verify all dependencies are in `package.json`
- Ensure TypeScript compilation passes

### Performance Optimization

#### Backend (Railway)
- Monitor container resource usage
- Consider upgrading Railway plan for more resources
- Implement connection pooling for database

#### Frontend (Vercel)
- Enable Vercel Analytics for performance monitoring
- Use Next.js Image optimization
- Implement proper caching strategies

## Security Considerations

### Environment Variables
- Never commit API keys to Git
- Use Railway and Vercel secret management
- Rotate keys regularly

### CORS Configuration
- Only allow your Vercel domain in CORS_ORIGIN
- Consider implementing authentication
- Use HTTPS for all communications

### Database Security
- Use strong passwords for database
- Enable SSL connections
- Regular database backups

## Monitoring and Maintenance

### Railway Monitoring
- Set up Railway alerts for resource usage
- Monitor application logs
- Track database performance

### Vercel Monitoring
- Enable Vercel Analytics
- Monitor build times and performance
- Set up error tracking

### Database Maintenance
- Regular backups
- Monitor query performance
- Clean up old data periodically

## Cost Optimization

### Railway Costs
- Monitor container usage
- Consider stopping unused containers
- Optimize database queries

### Vercel Costs
- Use Vercel's free tier for small projects
- Monitor bandwidth usage
- Optimize bundle sizes

## Next Steps

After successful deployment:

1. **Set up custom domains** for both Railway and Vercel
2. **Implement authentication** for user management
3. **Add monitoring and analytics**
4. **Set up CI/CD pipelines**
5. **Implement backup strategies**
6. **Add rate limiting and security measures**

## Support

If you encounter issues:

1. Check the logs in both Railway and Vercel
2. Verify all environment variables are correct
3. Test locally first to isolate issues
4. Check the project's GitHub issues
5. Contact the project maintainers
