# 守夜人二次精修验证 · 2026-10-24

## 目标

接着 2026-10-23 的人物骨架，把「人物贴图一般、不精致」这条反馈继续落实到真实可看的层面：头脸结构、服装层次、手脚体积、动作与声音的对应关系。碰撞体、伤害、弹道原点、瞄准方式、触屏与本地存档不变。

## 改了什么（按可感知的顺序）

1. **头脸**：颧骨受光面 / 腮部阴影 / 下颌投影三层；鼻子拆成鼻梁、鼻头、鼻翼与鼻孔四段；眼睛有上睑线、下睑受光、虹膜与高光点；嘴唇有上唇阴影、下唇受光与嘴角。侧面、四分之三、正面各自一套，背面是三块发面和颈后阴影。
2. **帽子**：帽冠三个折面 + 帽箍 + 帽徽，喙檐分亮暗两层并带一条湿边高光。
3. **服装**：肩线湿布高光与腰际褶皱，肩甲独立圆面板且压暗，肘部折痕与前臂布褶。
4. **手脚**：膝盖折痕、裤腿褶皱、外侧受光缝；靴子拆鞋面 / 脚背 / 鞋头包片 / 沿条 / 鞋底湿光。
5. **下摆 / 披风 / 围巾**：垂坠折线、下沿厚度、羊毛竖纹、内侧暗面、月光边、针织纹与流苏。
6. **动作**：受击沿攻击来源方向后仰下沉；低血量轻微下蹲弓身；受击闪白改为低强度覆盖叠在精确剪影上。
7. **可读性与声音**：轮廓加法光、脚部冷光池；脚步声改由步频相位驱动。

## 验证记录

### 自动化测试

- `node --check js/*.js`：7 份脚本全部通过。
- `node --test tests/*.test.cjs`：**70 / 70 通过**（原 64 项 + 本轮新增 6 项）。
- 本轮新增用例：
  - `footsteps fire on the walk cycle, not a fixed timer, and scale with real speed` —— 静止无声、每半步一次、次数与相位差严格相等。
  - `taking a hit records the knockback direction and decays it` —— `hurtKick` 从 1 衰减回 0，方向为有限值。
  - `a heart picked up while badly wounded also grants a brief grace window` —— 低血拾取给无敌窗口，满血拾取不给。
  - `recoil and knockback move the torso while the barrel keeps its gameplay aim line` —— 后坐/受击改变躯干姿态，枪口锚点仍为有限值。
  - `wounded posture is derived from hp only when health is supplied` —— 不传血量时姿态与旧版完全一致（向后兼容），受伤时下沉且不超过 2 单位。
  - `radius light adds silhouette separation without changing the painted parts` —— 轮廓光只重放面具，彩绘层数量不变，alpha ≤ 0.3。

### 真实浏览器（本地 5178 无缓存预览，真实 classic scripts + Canvas）

- 菜单 → 选武器 → 「踏入长夜」：按钮真实点击后 `state=playing`。
- 移动与射击：按 D 实际位移 349 世界单位，自动射击计数 4。
- 定向瞄准：真实 PointerEvent 按下后 HUD 切到「定向瞄准」，松开恢复。
- 冲刺：Space 后产生 9 个完整姿态残影，`player.r` 仍为 15。
- 受击：`hurt(30)` 后 `hurtKick=1`，血量 120→90，人物向来源反向后仰。
- 升级：`levelUp()` 出三张卡，按 1 选完回到 `playing`。
- Boss：调试生成后推进 150 帧，Boss 存活且血量下降；暂停时推进 60 帧状态不变，恢复后继续。
- 结算：`win()` 后 `state=over`。
- 长跑：连续 600 帧 `step + renderOnce`（游戏内 10 秒，外加自然实时）无异常，血量有限；浏览器 console 无 error。
- 手机：375×812、重载设备门控后 `body.touch`、`zoom=1`；虚拟摇杆 PointerEvent 后位移 192 世界单位，冲刺按钮可点。
- 桌面：1280×800 正常缩放，人物在暗场中轮廓、脸部和腿部均可辨认。

### 未做 / 说明

- 本轮的对比图保存在仓库外的本机目录，未提交到公开仓库（仓库为 public，避免个人环境信息）。
- 场景随机物与运行时刻不同，前后对比不作逐像素比较。
- 一切素材仍为程序化绘制，无外部图像、字体或网络依赖；`localStorage` 键与数据结构未变。
