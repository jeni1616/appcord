# AppCord - Enhanced Features

This document describes the newly implemented features in AppCord, an AI-powered web application builder.

## Overview

AppCord now includes a complete code generation and deployment pipeline with the following major features:

1. **Actual Code Generation Engine** - Generate real, production-ready Next.js applications
2. **Real Deployment to Preview Environments** - Deploy to Vercel with live preview URLs
3. **Advanced AI Chat Iterations** - Iteratively refine your app through natural language chat
4. **Custom Domain Management** - Add and manage custom domains for deployed apps

---

## 1. Code Generation Engine

### Implementation Files
- `/lib/services/codeGenerator.ts` - Core code generation service
- `/app/api/projects/generate-code/route.ts` - API endpoint for code generation

### Features
- Generates complete Next.js 16 applications with TypeScript
- Uses Claude Sonnet 4.5 (fallback to GPT-4o)
- Generates all necessary files:
  - Pages (App Router structure)
  - Components (reusable UI)
  - API routes
  - Type definitions
  - Configuration files (next.config.js, tailwind.config.ts, etc.)
  - Package.json with dependencies
  - Supabase schemas if needed
  - README with setup instructions

### API Usage

```javascript
POST /api/projects/generate-code
Content-Type: application/json

{
  "projectId": "uuid-here"
}

// Response
{
  "success": true,
  "buildId": "uuid",
  "filesCount": 25,
  "structure": "Brief explanation of structure",
  "buildTimeSeconds": 45
}
```

### Database Schema
Generated files are stored in the `project_files` table:
- `file_path` - Relative path (e.g., "app/page.tsx")
- `file_content` - Complete file content
- `file_type` - Type: component, page, api, config, style, type

### Token Usage
- Estimated: 5,000 tokens per build
- Actual usage tracked in `usage_logs` table
- User tokens automatically deducted

---

## 2. Deployment Service (Vercel Integration)

### Implementation Files
- `/lib/services/deploymentService.ts` - Vercel deployment service
- `/app/api/projects/deploy/route.ts` - Deployment API endpoint

### Features
- Automated deployment to Vercel
- Creates Vercel projects if they don't exist
- Generates preview URLs for instant testing
- Tracks deployment status and history
- Environment variable management

### Setup Requirements

Add these environment variables to your `.env.local`:

```env
VERCEL_TOKEN=your_vercel_token_here
VERCEL_TEAM_ID=your_team_id_here (optional)
```

To get a Vercel token:
1. Go to https://vercel.com/account/tokens
2. Create a new token with deployment permissions
3. Add it to your environment variables

### API Usage

```javascript
POST /api/projects/deploy
Content-Type: application/json

{
  "projectId": "uuid-here"
}

// Response
{
  "success": true,
  "previewUrl": "https://your-app-abc123.vercel.app",
  "productionUrl": "https://your-app.vercel.app"
}
```

### Deployment Flow
1. Fetch generated files from `project_files` table
2. Create or get existing Vercel project
3. Upload files to Vercel
4. Wait for deployment to complete (max 5 minutes)
5. Update project with preview/production URLs
6. Create deployment record in `deployments` table

### Project Status States
- `draft` → Initial state after project creation
- `building` → Code generation in progress
- `ready` → Code generated, ready to deploy
- `deployed` → Successfully deployed to Vercel
- `failed` → Build or deployment failed

---

## 3. Advanced AI Chat Iterations

### Implementation Files
- `/app/api/projects/chat/route.ts` - Chat API with code refinement
- Updated `/app/project/[id]/page.tsx` - Chat UI with history

### Features
- Real-time chat with AI about your project
- Iterative code refinement based on feedback
- Chat history persistence
- Automatic file updates
- Token tracking per message

### Chat Flow
1. User sends message (e.g., "Make the header blue")
2. System fetches existing project files
3. AI analyzes request and modifies relevant files
4. Updated files saved to database
5. AI response explains changes made
6. User can see changes in preview

### API Usage

```javascript
// Send message
POST /api/projects/chat
Content-Type: application/json

{
  "projectId": "uuid-here",
  "message": "Make the header blue and add a logo"
}

// Response
{
  "success": true,
  "response": "I've updated your project...",
  "filesUpdated": 3,
  "tokensUsed": 2500,
  "tokensRemaining": 7500
}

// Get chat history
GET /api/projects/chat?projectId=uuid-here

// Response
{
  "success": true,
  "messages": [
    {
      "role": "user",
      "content": "Make the header blue",
      "created_at": "2025-01-15T10:30:00Z"
    },
    {
      "role": "assistant",
      "content": "I've updated the header...",
      "created_at": "2025-01-15T10:30:15Z"
    }
  ]
}
```

### Database Schema

**chat_messages table:**
- `project_id` - Reference to project
- `user_id` - Message author
- `role` - 'user' or 'assistant'
- `content` - Message text
- `tokens_used` - Tokens for this message
- `created_at` - Timestamp

**iterations table:**
- `project_id` - Reference to project
- `user_prompt` - User's request
- `ai_response` - AI's explanation
- `changes_made` - JSON of changes
- `tokens_used` - Tokens consumed
- `status` - 'completed' or 'failed'

### Token Cost
- Estimated: 3,000 tokens per chat iteration
- Depends on:
  - Number of existing files
  - Complexity of request
  - Chat history length (last 20 messages)

---

## 4. Custom Domain Management

### Implementation Files
- `/app/api/projects/domains/route.ts` - Domain management API
- `/components/CustomDomainManager.tsx` - UI component
- `/lib/services/deploymentService.ts` - Vercel domain integration

### Features
- Add custom domains to deployed projects
- DNS configuration guidance
- Domain verification
- Multiple domains per project
- Automatic SSL certificates (via Vercel)

### API Endpoints

```javascript
// Get domains for a project
GET /api/projects/domains?projectId=uuid-here

// Add domain
POST /api/projects/domains
{
  "projectId": "uuid-here",
  "domain": "myapp.example.com"
}

// Verify domain
PATCH /api/projects/domains
{
  "domainId": "uuid-here"
}

// Remove domain
DELETE /api/projects/domains?domainId=uuid-here
```

### Domain Setup Process

1. **Add Domain**
   - User submits domain name
   - System validates format
   - Domain added to Vercel project
   - DNS records returned to user

2. **Configure DNS**
   User adds DNS records at their provider:
   ```
   Type: A
   Name: @
   Value: 76.76.21.21

   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

3. **Verify Domain**
   - User clicks "Verify" button
   - System checks DNS propagation
   - Updates domain status to "active"
   - SSL certificate auto-provisioned

### Database Schema

**custom_domains table:**
- `project_id` - Reference to project
- `domain` - Domain name (unique)
- `verified` - Boolean status
- `verification_token` - Security token
- `dns_records` - JSON of required records
- `status` - 'pending', 'verifying', 'active', 'failed'
- `created_at` - When added
- `verified_at` - When verified

**projects table (new fields):**
- `custom_domain` - Current custom domain
- `custom_domain_verified` - Verification status
- `vercel_project_id` - Vercel project reference

### UI Component Usage

```tsx
import { CustomDomainManager } from "@/components/CustomDomainManager"

<CustomDomainManager
  projectId={project.id}
  projectStatus={project.status}
/>
```

---

## Updated Project Workflow

### Complete User Journey

1. **Create Project**
   - User describes their app idea
   - AI generates comprehensive scope
   - User reviews and customizes todo list
   - Click "Build App" → Project created in `draft` status

2. **Build Application**
   - Navigate to project page
   - Click "Build App" button
   - AI generates all code files
   - Status changes: `draft` → `building` → `ready`
   - Files stored in database

3. **Deploy to Vercel**
   - Click "Deploy" button
   - Code uploaded to Vercel
   - Preview URL generated
   - Status changes: `ready` → `deployed`
   - Live app accessible

4. **Iterate with AI**
   - Use chat to request changes
   - "Make the navbar darker"
   - "Add a contact form"
   - "Change the color scheme to purple"
   - Each message refines the code
   - Click "Redeploy" to see changes live

5. **Add Custom Domain**
   - Enter your domain name
   - Configure DNS records as shown
   - Click "Verify Domain"
   - App accessible at custom URL

---

## Environment Variables Required

Create a `.env.local` file with:

```env
# Supabase (existing)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# AI Services (existing)
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key

# NEW: Vercel Deployment
VERCEL_TOKEN=your_vercel_token
VERCEL_TEAM_ID=your_team_id (optional)
```

---

## Database Migration

Run the updated schema in Supabase SQL Editor:

```sql
-- New fields in projects table
ALTER TABLE projects
ADD COLUMN dependencies JSONB,
ADD COLUMN env_variables JSONB,
ADD COLUMN custom_domain VARCHAR(255),
ADD COLUMN custom_domain_verified BOOLEAN DEFAULT false,
ADD COLUMN vercel_project_id VARCHAR(255);

-- New tables
CREATE TABLE project_files (...);
CREATE TABLE chat_messages (...);
CREATE TABLE custom_domains (...);

-- See supabase/schema.sql for complete migration
```

Or simply run the complete updated schema file:
```bash
# Copy and execute supabase/schema.sql in Supabase SQL Editor
```

---

## API Reference Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/projects/generate-code` | POST | Generate code for project |
| `/api/projects/deploy` | POST | Deploy to Vercel |
| `/api/projects/chat` | POST | Send chat message |
| `/api/projects/chat` | GET | Get chat history |
| `/api/projects/domains` | GET | List domains |
| `/api/projects/domains` | POST | Add domain |
| `/api/projects/domains` | PATCH | Verify domain |
| `/api/projects/domains` | DELETE | Remove domain |

---

## Testing the Features

### 1. Test Code Generation
```bash
# Create a project through UI
# Click "Build App"
# Check Supabase project_files table for generated files
```

### 2. Test Deployment
```bash
# After building, click "Deploy"
# Visit the preview URL
# Check Vercel dashboard for new project
```

### 3. Test Chat
```bash
# In deployed project, use chat:
# "Add a dark mode toggle"
# "Make the buttons rounded"
# Check that files update in database
```

### 4. Test Custom Domain
```bash
# Add domain in UI
# Configure DNS as instructed
# Wait for propagation (5-30 minutes)
# Click "Verify Domain"
```

---

## Token Costs Summary

| Action | Estimated Tokens | Notes |
|--------|-----------------|-------|
| Scope Generation | 1,000-2,000 | Initial project planning |
| Code Generation | 5,000-8,000 | Full app build |
| Chat Iteration | 2,000-4,000 | Per message |
| Code Refinement | 3,000-6,000 | Depends on complexity |

Free tier: 10,000 tokens (enough for 1-2 complete apps)

---

## Troubleshooting

### Code Generation Fails
- Check API keys are set correctly
- Verify user has sufficient tokens
- Check build logs in `builds` table
- Error messages stored in `error_message` field

### Deployment Fails
- Verify VERCEL_TOKEN is valid
- Check Vercel account has deployment permissions
- Review deployment logs
- Ensure project status is `ready` before deploying

### Chat Not Working
- Project must be in `ready` or `deployed` status
- Check user token balance
- Verify project has generated files
- Review chat error messages

### Domain Verification Fails
- DNS changes can take 5-30 minutes to propagate
- Verify DNS records match exactly
- Use `dig` or `nslookup` to check DNS
- Try verification again after waiting

---

## Future Enhancements

Potential additions to consider:
- GitHub repository integration
- Export code as ZIP download
- Real-time build logs streaming
- A/B testing for deployments
- Analytics integration
- Team collaboration features
- Version history and rollbacks

---

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review API error messages
3. Check Supabase logs
4. Review Vercel deployment logs
5. Examine browser console for client errors

---

*Last Updated: 2025-01-15*
