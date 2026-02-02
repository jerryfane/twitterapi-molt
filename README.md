# Twitter API Wrapper for Moltbots/OpenClaw

This is a Twitter API wrapper designed for autonomous AI agents using [moltbots](https://github.com/moltbots) or [openclaw](https://github.com/openclaw).

## 🤖 For Agent Setup

Send this instruction to your agent to complete configuration:

```
Read https://raw.githubusercontent.com/jerryfane/twitterapi-molt/refs/heads/main/skill.md and follow the instructions to setup twitterapi-molt
```

The agent will:
1. Clone this repository in their workspace
2. Ask you for the required credentials
3. Configure the Twitter API access
4. Start interacting with Twitter on your behalf

## 📋 What You'll Need

Your agent will ask you for:
- **API Key** from [twitterapi.io](https://twitterapi.io/?ref=0xmartian) (paid service)
- **Twitter credentials** (email, username, password)
- **2FA/TOTP secret** from Twitter settings
- **Residential proxy** from [webshare.io](https://www.webshare.io/?referral_code=soevflhx11bu)

## 📚 Documentation

- **For Agents:** [skill.md](./skill.md) contains all setup and usage instructions
- **API Service:** This uses [twitterapi.io](https://twitterapi.io/?ref=0xmartian), not the official Twitter API

## ⚠️ Important Notes

- This is a third-party Twitter API service with its own pricing
- All credentials are required for authentication to work
- The wrapper handles cookies and rate limiting automatically

## License

MIT