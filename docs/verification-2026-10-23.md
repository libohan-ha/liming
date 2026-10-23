# 人物精修验证 · 2026-10-23

## Target Behavior

以真实可读的雨夜猎人替换旧基础椭圆人物；头脸、服装、手脚、武器、动作、残影六项真实改善，同时保持战斗状态、输入和离线存档兼容。

## RED

- **Test added**：`tests/character.test.cjs` 的缓存、姿态、精确瞄准/遮挡、受击遮罩、残影等 10 项；`tests/game.test.cjs` 的离线入口与真实人物接入约束。
- **Behavior asserted**：本地 Character API、单次 3× 有界缓存、六武器、八向姿态、不改变玩家状态、精确瞄准、完整残影及减少动态。
- **Command**：`node --test tests/character.test.cjs`；`node --test tests/game.test.cjs`。
- **Observed failure**：角色测试初始 10/10 因缺少 Character 失败；入口缺少 `js/character.js`，接入缺少人物缓存初始化。
- **Failure is correct because**：旧版本没有玩家部件缓存及完整姿态渲染接口，仍由 game.js 即时绘制基础几何。
- **Additional regression**：独立检查发现旧光效坐标未适应新人物；新增 `player glow follows mirrored lantern and recoiling muzzle...`，真实 RED 为 `left aim must mirror the lantern glow with the actual cage`。不是以 mock 通过代替视觉验收。

## GREEN

- **Minimal implementation**：新增本地 `character.js`，替换旧玩家绘制，保留护盾、碰撞与战斗；冲刺记录只读扁平姿态，最多 12 个残影。新增共享提灯/枪口锚点，使旧光效跟随新造型。
- **Command**：`node --test tests/*.test.cjs`；逐份 `node --check js/*.js`。
- **Observed pass**：初次完整接入 62/62 通过；最终光效修正后结果见下方收尾记录。

## REFACTOR

- **Refactor done**：yes。
- **Change**：姿态归一化负零；靴底名义范围修正为 30×53.5 世界单位；测试 spy 浅拷贝冻结 API，避免修改生产对象；共用部件变换与光效锚点。无关玩法不改。
- **Command after refactor**：`node --test tests/*.test.cjs`，逐份语法检查，`git diff --check`。
- **Observed result**：见最终收尾记录。

## 浏览器实际流程

使用本地 5178 无缓存预览，真实 classic scripts 和 Canvas，而非仅导入函数。

- 菜单：可访问性快照有标准/快速/噩梦/每日四种模式；点击快速、点击「踏入长夜」开局。
- 移动/自动射击：D 键实际位移约 360 世界单位，自动射击计数 41；自然触发升级，三张卡出现在快照，按 1 选择后继续。
- 定向瞄准：真实鼠标 PointerEvent 按下，HUD「定向瞄准」，松开恢复「自动瞄准」。朝右角度约 0。
- 冲刺：Space 后产生 3 个完整姿态残影，`afterimage.pose` 存在；不改变 r=15。
- 时长：本轮浏览器流程实际墙钟超过 51 秒，游戏时间推进到 83.3217 秒；其中使用调试 step 加速额外帧，并非声称全为自然实时。
- 暂停：state=paused，推进 60 帧游戏时间不变，装备笔记含已选择强化；点击「继续」恢复。
- Boss：调试生成，推进 200 帧，Boss 存在且受伤，玩家生命正常。
- 胜利：调试推进至黎明，state=over、endWin=true；快照显示黎明结算、存活8分钟、统计和构筑。
- 三武器进化：分别实际打开进化升级并选卡，三者 `player.evolved` 和渲染姿态 evolved 均为 true。
- 失败：新手弩局取消无敌、受致命伤，推进至 state=over、endWin=false。
- 手机：375×812、重载手机设备门控、body.touch，默认 zoom=1；摇杆 PointerEvent 后位移约229世界单位，冲刺按钮可点击。
- 正常尺寸：桌面1280×800自适应缩放和额外zoom=1均看过；手机375×812默认缩放看过；侧向脸、背向头发/衣片及持枪遮挡已观察。
- 前后对比：仓库外本机对比目录保存真实桌面/手机四张图及阅读页，不提交公开仓库。场景随机物和运行时刻不完全相同，不作逐像素比较。

## 缓存与公开内容

30 部件，彩色/遮罩各768×336，总2,064,384字节（约1.97MiB），绘制不创建Canvas。全部经典脚本本地加载，无外部图像、字体或网络服务依赖；原有localStorage键和数据结构不变。

注意：仓库是 public，不要提交任何密钥、token、个人隐私文件；不要提交 _qa*.png 之类的临时文件。

## 最终收尾记录

- 共享锚点新增1项角色测试、1项真实渲染回归，最终64/64通过；全部7份JS逐份语法检查通过，diff空白检查通过。
- 光效修正后重载实际浏览器，左向提灯锚点为右侧(+10,+14)，枪口为左侧(-23.2,0)，减少动态的枪口光强为0；正常光强随muzzle衰减。手机最终画面再次检查，灯罩内暖光正确。
- 浏览器console无error，服务器无error，网络无失败请求。
- 独立只读检查发现的两个坐标问题均修复并回归；公开内容扫描无密钥/隐私文件和临时截图（数字种子2166136261为误报，非个人路径）。
- 提交和远端状态由最终交付的Git结果确认，不预先声称推送成功。

## Next Behavior

本轮完成后，每日迭代继续以该人物品质为基线，不恢复旧椭圆人物；新增玩法不是本轮范围。
