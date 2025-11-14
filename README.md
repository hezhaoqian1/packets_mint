# Ping Mint 批量铸造工具

使用脚本一键完成 USDC 授权并批量调用 NetPackets 合约的 `mint()` 方法。脚本基于 Node.js，封装了常用参数和容错提示，方便快速批量铸造。

## 功能简介
- **一次授权**：检测当前 USDC 授权额度，不足时自动发起一次 `approve`，默认授权至最大值。
- **批量铸造**：按顺序发送指定数量的 `mint()` 交易，可插入延迟防止抢跑或 RPC 节流。
- **灵活参数**：支持自定义每次铸造所需 USDC、单独执行授权、跳过授权、覆盖 Gas Limit 等。

## 环境准备
1. 安装 [Node.js](https://nodejs.org/) 18 或以上版本。
2. 克隆或下载本项目代码。
3. 执行依赖安装：
   ```bash
   npm install
   ```
4. 复制环境变量模板并填写：
   ```bash
   cp .env.example .env
   ```
   - `BASE_RPC_URL`：Base 主网 RPC 地址，例如 `https://mainnet.base.org` 或个人节点。
   - `PRIVATE_KEY`：执行授权与铸造的钱包私钥（带 `0x` 前缀）。请妥善保管，勿泄露。

## 使用说明
脚本入口位于 `batch-mint.js`，已在 `package.json` 中配置快捷命令：
```bash
npm run mint -- [参数]
```

常用参数说明：

| 参数 | 说明 | 默认值 |
| ---- | ---- | ---- |
| `--count, -c` | 铸造交易次数（逐笔顺序发送） | `1` |
| `--usdc-per-mint, -p` | 每次铸造消耗的 USDC 数量（十进制字符串） | `1` |
| `--approval-amount` | 授权额度，`unlimited` 表示最大整数 | `unlimited` |
| `--skip-approval` | 跳过授权步骤（即使额度不足） | `false` |
| `--approve-only` | 只执行授权，完成后退出 | `false` |
| `--delay-ms, -d` | 每笔铸造之间的延迟（毫秒） | `0` |
| `--gas-limit` | 为单笔 `mint` 交易手动设置 Gas Limit | 无 |

### 示例
- **一次性授权后连续铸造 5 次**：
  ```bash
  npm run mint -- --count 5
  ```

- **授权 10 USDC 并只执行授权**：
  ```bash
  npm run mint -- --approval-amount 10 --approve-only
  ```

- **跳过授权、手动设置 Gas Limit 和延迟**：
  ```bash
  npm run mint -- --skip-approval --count 3 --gas-limit 160000 --delay-ms 500
  ```

## 注意事项
- 确保钱包内有足够的 Base 主网 ETH 支付 Gas，以及足够的 USDC 余额。
- 默认授权最大额度，若只想授权精确额度，可指定 `--approval-amount`。
- 建议先在测试钱包或小额验证后再批量执行，避免合约风险或价格波动导致损失。
- 请妥善保管 `.env` 中的私钥，避免将 `.env` 文件提交至公开仓库。



