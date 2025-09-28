# RootInherit - Blockchain Inheritance Management System

A decentralized inheritance management system built on the Rootstock (RSK) blockchain network. This project allows users to create inheritance plans, manage beneficiaries, and automatically distribute assets based on customizable timeout periods.

## 🚀 Features

- **Smart Contract Inheritance Plans**: Create and manage inheritance plans with customizable timeout periods
- **Beneficiary Management**: Add and remove beneficiaries for your inheritance plan
- **Automatic Distribution**: Funds are automatically distributed to beneficiaries if the owner doesn't reset the timer
- **Protocol Protection**: 50% protocol fee retention mechanism
- **Full Web Interface**: Modern Next.js frontend with complete wallet integration
- **Responsive Design**: Mobile-friendly UI built with Tailwind CSS and shadcn/ui

## 🛠 Tech Stack

- **Blockchain**: Solidity, Hardhat, Ethers.js
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Node.js, Prisma
- **Testing**: Hardhat Test Suite
- **Deployment**: RSK Testnet

## 📦 Project Structure

```
RootInherit/
├── contracts/           # Smart contract source files
├── frontend/           # Next.js frontend application
├── backend/            # Node.js backend service
├── test/              # Contract test files
└── scripts/           # Deployment and utility scripts
```

## 🔧 Quick Start

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/RootInherit.git
   cd RootInherit
   ```

2. Install dependencies:
   ```bash
   # Install root dependencies
   npm install
   
   # Install frontend dependencies
   cd frontend && npm install
   
   # Install backend dependencies
   cd ../backend && npm install
   ```

3. Configure environment:
   - Copy `.env.example` to `.env` in each directory
   - Update with your configuration values

4. Start development environment:
   ```bash
   # Start Hardhat node (new terminal)
   npx hardhat node
   
   # Deploy contract (new terminal)
   npx hardhat run scripts/deploy.ts --network localhost
   
   # Start frontend (new terminal)
   cd frontend && npm run dev
   
   # Start backend (new terminal)
   cd backend && npm run dev
   ```

5. Visit `http://localhost:3000` to access the application

## 🧪 Testing

Run the test suite:

```bash
npx hardhat test
REPORT_GAS=true npx hardhat test # with gas reporting
```

## 📄 Smart Contract

The `InheritanceContract` is deployed on RSK Testnet:
- **Address**: `0x10F36d94Fb5E7Cd964E277e9475b0f139E475A34`
- **Network**: Rootstock Testnet (Chain ID: 31)
- **Explorer**: [View on RSK Explorer](https://explorer.testnet.rootstock.io/address/0x10F36d94Fb5E7Cd964E277e9475b0f139E475A34)

## 📚 Documentation

For detailed documentation, please refer to:
- [Smart Contract Documentation](./DEPLOYMENT.md)
- [Frontend Documentation](./frontend/README.md)
- [Backend Documentation](./backend/README.md)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
