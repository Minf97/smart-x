import i18n from "i18next";
import { initReactI18next } from "react-i18next";

i18n.use(initReactI18next).init({
  fallbackLng: "en",
  resources: {
    en: {
      translation: {
        appName: "electron-shadcn",
        titleHomePage: "Home Page",
        titleSecondPage: "Second Page",
        documentation: "Documentation",
        madeBy: "Made by LuanRoger",
        // 报警文案
        alerts: {
          status: {
            backlog: "Backlog",
            todo: "Todo",
            in_progress: "In Progress",
            in_review: "In Review",
            done: "Done",
            canceled: "Canceled",
            duplicate: "Duplicate",
          },
          priority: {
            P0: "P0",
            P1: "P1",
            P2: "P2",
          },
        },
        // 面板文案
        dashboard: {
          title: "AI Alert Dashboard",
          allAlerts: "All Alerts",
          searchPlaceholder: "Search alerts...",
          source: "Source",
          reported: "Reported",
          stackTrace: "Stack Trace",
          analysis: "AI Analysis",
          rootCause: "Root Cause",
          suggestedFix: "Suggested Fix",
          activity: "Activity",
          analysisStarted: "Alert created - AI analysis started",
          contextRetrieved: "Code context retrieved",
          fixGenerated: "Fix suggestion generated",
          createPr: "Create PR/MR",
          markResolved: "Mark as Resolved",
          dismiss: "Dismiss",
        },
        // 语言文案
        language: {
          toggle: "Switch language",
          toEnglish: "Switch to English",
          toChinese: "Switch to Chinese",
        },
      },
    },
    "zh-CN": {
      translation: {
        appName: "electron-shadcn",
        titleHomePage: "首页",
        titleSecondPage: "第二页",
        documentation: "文档",
        madeBy: "由 LuanRoger 制作",
        // 报警文案
        alerts: {
          status: {
            backlog: "Backlog",
            todo: "待处理",
            in_progress: "处理中",
            in_review: "待审核",
            done: "已完成",
            canceled: "已取消",
            duplicate: "重复",
          },
          priority: {
            P0: "P0",
            P1: "P1",
            P2: "P2",
          },
        },
        // 面板文案
        dashboard: {
          title: "AI 报警面板",
          allAlerts: "全部报警",
          searchPlaceholder: "搜索报警...",
          source: "来源",
          reported: "上报时间",
          stackTrace: "错误堆栈",
          analysis: "AI 分析",
          rootCause: "问题根因",
          suggestedFix: "修复建议",
          activity: "处理记录",
          analysisStarted: "报警已创建，AI 已开始分析",
          contextRetrieved: "已获取代码上下文",
          fixGenerated: "已生成修复建议",
          createPr: "创建 PR/MR",
          markResolved: "标记已解决",
          dismiss: "忽略",
        },
        // 语言文案
        language: {
          toggle: "切换语言",
          toEnglish: "切换到英文",
          toChinese: "切换到中文",
        },
      },
    },
  },
});
