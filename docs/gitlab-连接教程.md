# GitLab 连接教程

这篇文档教你把 GitLab 仓库连接到当前应用，并说明如何获取 `GitLab Client ID`。

当前实现基于本项目现有代码，连接 GitLab 时会使用：

- 回调地址：`http://127.0.0.1:45913/oauth/gitlab/callback`
- 授权范围：`api`、`read_user`
- 填写项：`GitLab 地址`、`GitLab Client ID`

## 先理解两个概念

### 1. GitLab 地址是什么

- 如果你使用 `GitLab.com`，填写：`https://gitlab.com`
- 如果你使用公司自建 GitLab，填写你的实例根地址，例如：`https://gitlab.example.com`

### 2. GitLab Client ID 是什么

在 GitLab 的应用配置页面里，它通常显示为：

- `Application ID`

在本应用里，`Application ID` 就是你要填写的 `GitLab Client ID`。

> 当前应用使用的是带 PKCE 的 OAuth 流程，所以这里只需要 `Client ID`，不需要把 `Client Secret` 填到应用里。

## 连接前准备

请先确认你已经具备下面条件：

- 已打开桌面应用
- 能正常访问你的 GitLab 实例
- 有权限授权 GitLab 账号
- 至少有一个你可写的仓库

如果你在应用里连接成功后看不到仓库，通常不是连接失败，而是当前账号没有可写仓库，或者仓库没有默认分支。

## 第一步：在 GitLab 里创建应用并获取 Client ID

推荐优先使用**用户级应用**。如果你们公司统一管理 OAuth 应用，也可以让管理员改为创建**组级应用**或**实例级应用**。

### 方式 A：用户自己创建（推荐）

以 GitLab 官方界面为准，不同版本名称可能略有区别，但核心步骤一致：

1. 登录你的 GitLab
2. 进入个人设置
3. 找到 `Applications`
4. 新建一个 OAuth 应用
5. 名称可以填写：`AI Alert Dashboard`
6. `Redirect URI` 填写：

```text
http://127.0.0.1:45913/oauth/gitlab/callback
```

7. 勾选作用域：
   - `api`
   - `read_user`
8. 创建应用
9. 创建成功后，复制页面里的 `Application ID`

这个 `Application ID`，就是你要填到应用里的 `GitLab Client ID`。

### 方式 B：让管理员统一创建

如果你没有权限自己创建应用，可以把下面信息发给 GitLab 管理员：

- 应用名称：`AI Alert Dashboard`
- 回调地址：`http://127.0.0.1:45913/oauth/gitlab/callback`
- 作用域：`api`、`read_user`

管理员创建完成后，把 `Application ID` 发给你即可。

## 第二步：在桌面应用里连接 GitLab

1. 打开应用
2. 进入 `Dashboard`
3. 点击 `新建项目`
4. 在 `Provider` 里选择 `GitLab`
5. 在 `GitLab 地址` 输入你的实例地址
6. 在 `GitLab Client ID` 输入刚才拿到的 `Application ID`
7. 点击连接 GitLab 的按钮
8. 应用会自动打开浏览器，进入 GitLab 授权页
9. 在浏览器里确认授权
10. 授权成功后，页面会跳回本地回调页，并提示你可以返回应用
11. 回到应用，等待连接状态变成已连接

## 第三步：选择仓库并完成项目创建

连接成功后，应用会自动拉取你当前账号可写的 GitLab 仓库。

接下来按下面操作：

1. 选择一个仓库
2. 确认默认分支或手动修改 `Base branch`
3. 输入项目名称
4. 点击底部的 `连接`

创建成功后，应用会生成当前项目专属的 `Webhook 地址`。复制这个地址后，就可以继续接报警数据了。

## 常见问题

### 1. 我只看到了 `Client Secret`，哪个才是要填的？

填 `Application ID`，不是 `Client Secret`。

### 2. GitLab 地址应该填哪个？

- `GitLab.com`：填 `https://gitlab.com`
- 自建 GitLab：填你们公司的 GitLab 根地址，例如 `https://gitlab.example.com`

不要填某个项目地址，也不要填某个仓库详情页地址。

### 3. 授权后应用一直显示“等待 GitLab 授权”

可以按下面顺序检查：

- 确认桌面应用没有关闭
- 确认回调地址填写的是 `http://127.0.0.1:45913/oauth/gitlab/callback`
- 确认没有多写或少写 `/`
- 确认本机没有拦截 `127.0.0.1:45913`
- 超过几分钟后重新发起一次授权

### 4. 连接成功了，但仓库列表是空的

当前应用只会显示：

- 你当前账号有写权限的仓库
- 已设置默认分支的仓库

如果列表为空，先检查你的账号权限和仓库默认分支设置。

### 5. 为什么应用没有让我填 `Client Secret`？

这是当前项目的设计决定。现有实现只要求用户填写 `Client ID`，然后通过本地回调完成授权。

## 官方参考

- GitLab OAuth provider 文档：<https://docs.gitlab.com/integration/oauth_provider/>
- GitLab OAuth 2.0 API 文档：<https://docs.gitlab.com/api/oauth2/>

如果你们公司 GitLab 的管理入口和本文截图路径略有不同，优先以你们当前 GitLab 版本的实际界面为准。
