# AppCord - AI Web Application Builder

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Latest-3ecf8e)](https://supabase.com/)

Transform text descriptions into fully functional, production-ready web applications in minutes, not weeks. AppCord leverages cutting-edge AI technology (OpenAI GPT-4o and Claude Sonnet 4.5) to democratize web application development.

## 🚀 Features

- **Natural Language to App**: Describe your app in plain English, AI builds it
- **Iterative Todo-Based Planning**: Transparent workflow showing exactly what will be built
- **Hybrid AI Strategy**: Leverage both OpenAI and Claude for optimal results
- **Supabase-First Architecture**: Native integration with Supabase for instant backend
- **Live Preview During Build**: Real-time progress updates with build status
- **Full Code Access**: View, download, and customize generated code
- **Modern Tech Stack**: Next.js 16, TypeScript, Tailwind CSS, shadcn/ui

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- Node.js 20 or higher
- npm or yarn package manager
- A Supabase account
- OpenAI API key
- Anthropic (Claude) API key
- Stripe account (for payment integration)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/appcord.git
   cd appcord
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file in the root directory:
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # OpenAI
   OPENAI_API_KEY=your_openai_api_key

   # Anthropic (Claude)
   ANTHROPIC_API_KEY=your_anthropic_api_key

   # Stripe
   STRIPE_SECRET_KEY=your_stripe_secret_key
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

   # App Configuration
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   JWT_SECRET=your_jwt_secret_key_change_this_in_production
   ```

4. **Set up Supabase database**

   Run the SQL script in your Supabase SQL editor:
   ```bash
   # The schema is located at:
   # supabase/schema.sql
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

## 🏗️ Project Structure

```
appcord/
├── app/                      # Next.js 16 app directory
│   ├── api/                 # API routes
│   │   └── projects/        # Project-related APIs
│   ├── auth/                # Authentication pages
│   │   ├── login/
│   │   └── signup/
│   ├── dashboard/           # Main dashboard
│   ├── project/             # Project pages
│   │   ├── new/            # New project wizard
│   │   └── [id]/           # Project view and build
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Landing page
├── components/              # React components
│   ├── ui/                 # shadcn/ui components
│   ├── dashboard/          # Dashboard components
│   ├── project/            # Project components
│   └── auth/               # Auth components
├── lib/                     # Utility libraries
│   ├── ai/                 # AI service integrations
│   │   ├── openai.ts       # OpenAI integration
│   │   └── claude.ts       # Claude integration
│   ├── supabase/           # Supabase clients
│   │   ├── client.ts       # Browser client
│   │   └── server.ts       # Server client
│   └── utils.ts            # Utility functions
├── types/                   # TypeScript type definitions
│   ├── database.ts         # Supabase types
│   └── index.ts            # App types
├── supabase/               # Supabase configuration
│   └── schema.sql          # Database schema
├── public/                 # Static assets
└── package.json            # Dependencies

```

## 🎯 Usage

### Creating a New Project

1. **Sign up or log in** to your AppCord account
2. **Click "New Project"** on the dashboard
3. **Describe your app** in plain English (be detailed!)
4. **Review the generated scope** and customize the todo list
5. **Click "Build App"** and watch AI create your application
6. **Preview and iterate** on your app with AI chat

### Example Project Descriptions

**Task Management App:**
```
A task management app where teams can create projects, assign tasks,
set deadlines, and track progress with a kanban board. Include user
authentication, real-time updates, and email notifications.
```

**Customer Feedback Portal:**
```
Customer feedback portal where users submit ideas, vote on features,
and admins can respond and mark status. Include categories, search,
and admin dashboard with analytics.
```

**Employee Directory:**
```
Internal employee directory with profile pages, department filters,
search functionality, and org chart visualization. Include photo
uploads and contact information management.
```

## 🔧 Configuration

### Supabase Setup

1. Create a new project in [Supabase](https://supabase.com)
2. Run the schema from `supabase/schema.sql` in the SQL editor
3. Copy your project URL and anon key to `.env.local`
4. Enable Email authentication in Supabase Dashboard

### AI Configuration

The app uses a hybrid AI strategy:
- **Claude Sonnet 4.5**: Complex reasoning, scope expansion, debugging
- **GPT-4o**: Fast code generation, todo lists, iterations

Configure in `lib/ai/`:
- Modify model selection logic in API routes
- Adjust token limits and temperature settings
- Customize system prompts for better results

## 📦 Deployment

### Deploy to Vercel (Recommended)

1. **Push your code to GitHub**
2. **Import project in Vercel**
3. **Add environment variables**
4. **Deploy!**

```bash
npm run build
```

### Deploy Anywhere Else

Build the production bundle:
```bash
npm run build
npm start
```

## 🎨 Customization

### Adding New UI Components

```bash
npx shadcn-ui@latest add [component-name]
```

### Modifying AI Prompts

Edit the prompts in:
- `lib/ai/openai.ts` - OpenAI prompts
- `lib/ai/claude.ts` - Claude prompts

### Changing the Tech Stack

Update the default tech stack in:
- `lib/ai/openai.ts` - `generateScopeWithGPT()`
- `lib/ai/claude.ts` - `generateScopeWithClaude()`

## 🔐 Security

- All API keys are server-side only
- Row Level Security (RLS) enabled on Supabase
- JWT tokens with short expiration
- HTTPS/TLS for all connections
- No execution of arbitrary user code

## 🐛 Troubleshooting

**Build fails with Supabase error:**
- Check your Supabase credentials in `.env.local`
- Ensure the database schema is properly set up
- Verify RLS policies are enabled

**AI generation fails:**
- Check API keys are valid
- Verify you have sufficient credits/quota
- Try refreshing and generating again

**Preview not loading:**
- Check the preview URL is valid
- Ensure the build completed successfully
- Check browser console for errors

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 Support

- Documentation: [docs.appcord.com](https://docs.appcord.com)
- Email: support@appcord.com
- GitHub Issues: [github.com/yourusername/appcord/issues](https://github.com/yourusername/appcord/issues)

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Supabase](https://supabase.com/) - Backend infrastructure
- [OpenAI](https://openai.com/) - AI models
- [Anthropic](https://anthropic.com/) - Claude AI

---

Built with ❤️ by the AppCord Team
