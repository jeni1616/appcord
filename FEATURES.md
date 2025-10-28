# AppCord - Enhanced Features

This document describes the newly implemented features in AppCord, an AI-powered web application builder.

## Overview

AppCord now includes a complete code generation and preview pipeline with the following major features:

1. **Actual Code Generation Engine** - Generate real, production-ready Next.js applications
2. **Instant Preview with StackBlitz WebContainers** - Live in-browser preview without deployment
3. **Advanced AI Chat Iterations** - Iteratively refine your app through natural language chat

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

## 2. StackBlitz WebContainers Preview

### Implementation Files
- `/lib/services/stackblitzService.ts` - StackBlitz integration service
- `/app/project/[id]/page.tsx` - Project view with embedded StackBlitz preview

### Features
- Instant in-browser preview using WebContainers technology
- No backend deployment required for testing
- Full Node.js environment runs directly in the browser
- Real-time preview updates as code changes
- "Open in StackBlitz" button for full editing experience
- Automatic template detection (Next.js, React, HTML, etc.)

### Setup Requirements

No additional environment variables needed! StackBlitz SDK is included via npm:

```bash
npm install @stackblitz/sdk
```

### How It Works

The preview is embedded directly in the project view page:

1. Fetch generated files from `project_files` table
2. Prepare files for StackBlitz SDK format
3. Detect appropriate template (node, react, html, etc.)
4. Embed project using StackBlitz WebContainers
5. Preview runs instantly in the browser

### StackBlitz Integration

```typescript
import sdk from '@stackblitz/sdk'

// Embed project in page
await sdk.embedProject(
  containerElement,
  {
    files: projectFiles,
    title: projectName,
    description: projectDescription,
    template: 'node' // or 'react', 'html', etc.
  },
  {
    view: 'preview',
    height: 600,
    hideNavigation: true
  }
)

// Open in new window
await sdk.openProject(stackblitzProject, {
  newWindow: true
})
```

### Project Status States
- `draft` → Initial state after project creation
- `building` → Code generation in progress
- `ready` → Code generated, preview available
- `deployed` → Synonym for ready (maintained for compatibility)
- `failed` → Build or generation failed

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

3. **Preview Instantly**
   - StackBlitz WebContainer loads automatically
   - Live preview appears in browser
   - No deployment or waiting required
   - Full Node.js environment running locally
   - Click "Open in StackBlitz" to edit in new window

4. **Iterate with AI**
   - Use chat to request changes
   - "Make the navbar darker"
   - "Add a contact form"
   - "Change the color scheme to purple"
   - Each message refines the code
   - Preview updates automatically after rebuild

5. **Deploy Anywhere**
   - Click "Open in StackBlitz" for full editing
   - Export code and deploy to any platform
   - Deploy directly from StackBlitz
   - Or download and deploy locally

---

## Environment Variables Required

Create a `.env.local` file with:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# AI Services
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key

# Stripe (for payments)
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Note: StackBlitz preview requires no additional environment variables!

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
| `/api/projects/chat` | POST | Send chat message |
| `/api/projects/chat` | GET | Get chat history |

---

## Testing the Features

### 1. Test Code Generation
```bash
# Create a project through UI
# Click "Build App"
# Check Supabase project_files table for generated files
```

### 2. Test StackBlitz Preview
```bash
# After building, preview loads automatically
# Check that StackBlitz container appears
# Verify preview shows your app
# Test "Open in StackBlitz" button
```

### 3. Test Chat
```bash
# In deployed project, use chat:
# "Add a dark mode toggle"
# "Make the buttons rounded"
# Check that files update in database
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

### Preview Not Loading
- Verify project has generated files
- Check browser console for StackBlitz errors
- Try refreshing the preview
- Ensure browser supports WebContainers (modern Chrome/Edge/Firefox)

### Chat Not Working
- Project must be in `ready` or `deployed` status
- Check user token balance
- Verify project has generated files
- Review chat error messages

---

## Future Enhancements

Potential additions to consider:
- GitHub repository integration
- Export code as ZIP download
- Real-time build logs streaming
- Direct deployment to Vercel/Netlify from UI
- Analytics integration
- Team collaboration features
- Version history and rollbacks
- Hot reloading in StackBlitz preview

---

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review API error messages
3. Check Supabase logs
4. Examine browser console for StackBlitz errors
5. Verify browser compatibility with WebContainers

---

*Last Updated: 2025-01-15*
