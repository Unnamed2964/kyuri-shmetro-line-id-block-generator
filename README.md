# 上海地铁线路号方块生成器

一个在浏览器中运行的工具，用于生成上海地铁风格的线路号方块 SVG 图形。

**🔗 在线使用：** https://Unnamed2964.github.io/shmetro-line-id-block-generator/

## 免责声明

本工具的设计参数（定位、字号等）均来自对 `reference/` 目录中实拍照片的**粗略视觉逆向工程**，属于个人估算，**不代表上海申通地铁集团有限公司的任何企业视觉标准或官方规范**。

输出结果仅供个人学习、参考及非商业用途，请勿将其用于任何官方或商业场合。

## 参考素材

`reference/` 目录中存放了逆向工程所参照的实拍图片，仅作为设计参数推导依据。

## 功能

- 输入线路号码，实时预览线路号方块效果
- 支持自定义颜色
- 导出标准 SVG（含 `<text>` 元素）
- 导出字形路径版 SVG（通过 opentype.js 将文字转为矢量路径，无需安装字体即可正确显示）

## 使用方法

直接在浏览器中打开 `shmetro-line-id-block-generator.html` 即可，无需任何构建或安装步骤。

## 许可证

[MIT License](LICENSE)

## 作者

Made by [Umamichi](https://github.com/Unnamed2964)


