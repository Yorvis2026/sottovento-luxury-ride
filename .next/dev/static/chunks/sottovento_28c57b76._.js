(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/sottovento/lib/utils.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "cn",
    ()=>cn
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sottovento/node_modules/clsx/dist/clsx.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sottovento/node_modules/tailwind-merge/dist/bundle-mjs.mjs [app-client] (ecmascript)");
;
;
function cn(...inputs) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["twMerge"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clsx"])(inputs));
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/sottovento/components/ui/button.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Button",
    ()=>Button,
    "buttonVariants",
    ()=>buttonVariants
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sottovento/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$slot$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sottovento/node_modules/@radix-ui/react-slot/dist/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sottovento/node_modules/class-variance-authority/dist/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sottovento/lib/utils.ts [app-client] (ecmascript)");
;
;
;
;
const buttonVariants = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cva"])("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive", {
    variants: {
        variant: {
            default: 'bg-primary text-primary-foreground hover:bg-primary/90',
            destructive: 'bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
            outline: 'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50',
            secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
            ghost: 'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
            link: 'text-primary underline-offset-4 hover:underline'
        },
        size: {
            default: 'h-9 px-4 py-2 has-[>svg]:px-3',
            sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
            lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
            icon: 'size-9',
            'icon-sm': 'size-8',
            'icon-lg': 'size-10'
        }
    },
    defaultVariants: {
        variant: 'default',
        size: 'default'
    }
});
function Button({ className, variant, size, asChild = false, ...props }) {
    const Comp = asChild ? __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$slot$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Slot"] : 'button';
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Comp, {
        "data-slot": "button",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])(buttonVariants({
            variant,
            size,
            className
        })),
        ...props
    }, void 0, false, {
        fileName: "[project]/sottovento/components/ui/button.tsx",
        lineNumber: 52,
        columnNumber: 5
    }, this);
}
_c = Button;
;
var _c;
__turbopack_context__.k.register(_c, "Button");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/sottovento/components/header.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Header",
    ()=>Header
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sottovento/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sottovento/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sottovento/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sottovento/components/ui/button.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$menu$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Menu$3e$__ = __turbopack_context__.i("[project]/sottovento/node_modules/lucide-react/dist/esm/icons/menu.js [app-client] (ecmascript) <export default as Menu>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/sottovento/node_modules/lucide-react/dist/esm/icons/x.js [app-client] (ecmascript) <export default as X>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$phone$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Phone$3e$__ = __turbopack_context__.i("[project]/sottovento/node_modules/lucide-react/dist/esm/icons/phone.js [app-client] (ecmascript) <export default as Phone>");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
function Header() {
    _s();
    const [isScrolled, setIsScrolled] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Header.useEffect": ()=>{
            const handleScroll = {
                "Header.useEffect.handleScroll": ()=>{
                    setIsScrolled(window.scrollY > 50);
                }
            }["Header.useEffect.handleScroll"];
            window.addEventListener("scroll", handleScroll);
            return ({
                "Header.useEffect": ()=>window.removeEventListener("scroll", handleScroll)
            })["Header.useEffect"];
        }
    }["Header.useEffect"], []);
    const navLinks = [
        {
            href: "#about",
            label: "About"
        },
        {
            href: "#services",
            label: "Services"
        },
        {
            href: "#fleet",
            label: "Fleet"
        },
        {
            href: "#contact",
            label: "Contact"
        }
    ];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
        className: `fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? "bg-background/95 backdrop-blur-md border-b border-border" : "bg-transparent"}`,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "container mx-auto px-4",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex items-center justify-between h-20",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                            href: "/",
                            className: "flex items-center gap-2 group",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "relative",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "w-12 h-12 border-2 border-primary flex items-center justify-center",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "font-sans text-2xl font-light tracking-wider",
                                            children: "SL"
                                        }, void 0, false, {
                                            fileName: "[project]/sottovento/components/header.tsx",
                                            lineNumber: 39,
                                            columnNumber: 17
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/sottovento/components/header.tsx",
                                        lineNumber: 38,
                                        columnNumber: 15
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/sottovento/components/header.tsx",
                                    lineNumber: 37,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "hidden md:block",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "font-sans text-sm font-light tracking-widest",
                                            children: "SOTTOVENTO"
                                        }, void 0, false, {
                                            fileName: "[project]/sottovento/components/header.tsx",
                                            lineNumber: 43,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "text-xs text-muted-foreground tracking-wider",
                                            children: "LUXURY RIDE"
                                        }, void 0, false, {
                                            fileName: "[project]/sottovento/components/header.tsx",
                                            lineNumber: 44,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/sottovento/components/header.tsx",
                                    lineNumber: 42,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/sottovento/components/header.tsx",
                            lineNumber: 36,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
                            className: "hidden md:flex items-center gap-8",
                            children: navLinks.map((link)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                    href: link.href,
                                    className: "text-sm tracking-wider hover:text-accent transition-colors",
                                    children: link.label
                                }, link.href, false, {
                                    fileName: "[project]/sottovento/components/header.tsx",
                                    lineNumber: 51,
                                    columnNumber: 15
                                }, this))
                        }, void 0, false, {
                            fileName: "[project]/sottovento/components/header.tsx",
                            lineNumber: 49,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "hidden md:flex items-center gap-4",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                    href: "tel:+14073830647",
                                    className: "flex items-center gap-2 text-sm hover:text-accent transition-colors",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$phone$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Phone$3e$__["Phone"], {
                                            className: "w-4 h-4"
                                        }, void 0, false, {
                                            fileName: "[project]/sottovento/components/header.tsx",
                                            lineNumber: 64,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            children: "+1 (407) 383-0647"
                                        }, void 0, false, {
                                            fileName: "[project]/sottovento/components/header.tsx",
                                            lineNumber: 65,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/sottovento/components/header.tsx",
                                    lineNumber: 63,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                    asChild: true,
                                    size: "sm",
                                    className: "tracking-wider",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                        href: "#booking",
                                        children: "BOOK YOUR RIDE"
                                    }, void 0, false, {
                                        fileName: "[project]/sottovento/components/header.tsx",
                                        lineNumber: 68,
                                        columnNumber: 15
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/sottovento/components/header.tsx",
                                    lineNumber: 67,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/sottovento/components/header.tsx",
                            lineNumber: 62,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: ()=>setIsMobileMenuOpen(!isMobileMenuOpen),
                            className: "md:hidden p-2",
                            "aria-label": "Toggle menu",
                            children: isMobileMenuOpen ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                className: "w-6 h-6"
                            }, void 0, false, {
                                fileName: "[project]/sottovento/components/header.tsx",
                                lineNumber: 78,
                                columnNumber: 33
                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$menu$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Menu$3e$__["Menu"], {
                                className: "w-6 h-6"
                            }, void 0, false, {
                                fileName: "[project]/sottovento/components/header.tsx",
                                lineNumber: 78,
                                columnNumber: 61
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/sottovento/components/header.tsx",
                            lineNumber: 73,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/sottovento/components/header.tsx",
                    lineNumber: 34,
                    columnNumber: 9
                }, this),
                isMobileMenuOpen && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "md:hidden py-4 border-t border-border animate-slide-up",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
                        className: "flex flex-col gap-4",
                        children: [
                            navLinks.map((link)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                    href: link.href,
                                    onClick: ()=>setIsMobileMenuOpen(false),
                                    className: "text-sm tracking-wider hover:text-accent transition-colors py-2",
                                    children: link.label
                                }, link.href, false, {
                                    fileName: "[project]/sottovento/components/header.tsx",
                                    lineNumber: 87,
                                    columnNumber: 17
                                }, this)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                href: "tel:+14073830647",
                                className: "flex items-center gap-2 text-sm hover:text-accent transition-colors py-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$phone$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Phone$3e$__["Phone"], {
                                        className: "w-4 h-4"
                                    }, void 0, false, {
                                        fileName: "[project]/sottovento/components/header.tsx",
                                        lineNumber: 100,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: "+1 (407) 383-0647"
                                    }, void 0, false, {
                                        fileName: "[project]/sottovento/components/header.tsx",
                                        lineNumber: 101,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/sottovento/components/header.tsx",
                                lineNumber: 96,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                asChild: true,
                                className: "w-full mt-2",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                    href: "#booking",
                                    children: "BOOK YOUR RIDE"
                                }, void 0, false, {
                                    fileName: "[project]/sottovento/components/header.tsx",
                                    lineNumber: 104,
                                    columnNumber: 17
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/sottovento/components/header.tsx",
                                lineNumber: 103,
                                columnNumber: 15
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/sottovento/components/header.tsx",
                        lineNumber: 85,
                        columnNumber: 13
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/sottovento/components/header.tsx",
                    lineNumber: 84,
                    columnNumber: 11
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/sottovento/components/header.tsx",
            lineNumber: 33,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/sottovento/components/header.tsx",
        lineNumber: 28,
        columnNumber: 5
    }, this);
}
_s(Header, "0+zEKVBL95ILuBb5rHE6ViYOHu8=");
_c = Header;
var _c;
__turbopack_context__.k.register(_c, "Header");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/sottovento/components/hero.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Hero",
    ()=>Hero
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sottovento/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
"use client";
;
function Hero() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        className: "relative min-h-screen flex items-center justify-center overflow-hidden",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "absolute inset-0 z-0",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                        src: "/luxury-black-car-interior-with-city-lights-at-nigh.jpg",
                        alt: "Luxury car interior",
                        className: "w-full h-full object-cover opacity-40",
                        loading: "eager"
                    }, void 0, false, {
                        fileName: "[project]/sottovento/components/hero.tsx",
                        lineNumber: 10,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background"
                    }, void 0, false, {
                        fileName: "[project]/sottovento/components/hero.tsx",
                        lineNumber: 16,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/sottovento/components/hero.tsx",
                lineNumber: 9,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "container mx-auto px-4 relative z-10 pt-20",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "max-w-4xl mx-auto text-center space-y-6 animate-fade-in",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                            className: "font-sans text-4xl md:text-6xl lg:text-7xl font-light tracking-wider text-balance",
                            children: [
                                "Orlando's Private Luxury",
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                                    fileName: "[project]/sottovento/components/hero.tsx",
                                    lineNumber: 24,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "text-accent",
                                    children: "Chauffeur Service"
                                }, void 0, false, {
                                    fileName: "[project]/sottovento/components/hero.tsx",
                                    lineNumber: 25,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/sottovento/components/hero.tsx",
                            lineNumber: 22,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-lg md:text-xl text-muted-foreground tracking-wide max-w-2xl mx-auto",
                            children: "Airport Transfers • Cruise Port • Executive Transportation"
                        }, void 0, false, {
                            fileName: "[project]/sottovento/components/hero.tsx",
                            lineNumber: 28,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex flex-col items-center gap-3 pt-4",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                    href: "#booking",
                                    style: {
                                        backgroundColor: "#C8A96A",
                                        color: "#000",
                                        borderRadius: "6px",
                                        padding: "14px 28px",
                                        fontWeight: 600,
                                        fontSize: "1rem",
                                        letterSpacing: "0.1em",
                                        textDecoration: "none",
                                        display: "inline-block",
                                        transition: "opacity 0.2s"
                                    },
                                    className: "book-cta-btn",
                                    children: "BOOK YOUR RIDE"
                                }, void 0, false, {
                                    fileName: "[project]/sottovento/components/hero.tsx",
                                    lineNumber: 34,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                    href: "#booking",
                                    className: "text-sm text-muted-foreground hover:text-accent transition-colors tracking-wide underline underline-offset-4",
                                    children: "Get Instant Quote"
                                }, void 0, false, {
                                    fileName: "[project]/sottovento/components/hero.tsx",
                                    lineNumber: 54,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/sottovento/components/hero.tsx",
                            lineNumber: 33,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "grid grid-cols-3 gap-4 md:gap-8 pt-12 max-w-2xl mx-auto",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "space-y-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "font-sans text-3xl md:text-4xl font-light",
                                            children: "24/7"
                                        }, void 0, false, {
                                            fileName: "[project]/sottovento/components/hero.tsx",
                                            lineNumber: 65,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "text-xs md:text-sm text-muted-foreground tracking-wide",
                                            children: "Available"
                                        }, void 0, false, {
                                            fileName: "[project]/sottovento/components/hero.tsx",
                                            lineNumber: 66,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/sottovento/components/hero.tsx",
                                    lineNumber: 64,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "space-y-2 border-x border-border",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "font-sans text-3xl md:text-4xl font-light",
                                            children: "100+"
                                        }, void 0, false, {
                                            fileName: "[project]/sottovento/components/hero.tsx",
                                            lineNumber: 69,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "text-xs md:text-sm text-muted-foreground tracking-wide",
                                            children: "Happy Clients"
                                        }, void 0, false, {
                                            fileName: "[project]/sottovento/components/hero.tsx",
                                            lineNumber: 70,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/sottovento/components/hero.tsx",
                                    lineNumber: 68,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "space-y-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "font-sans text-3xl md:text-4xl font-light",
                                            children: "5★"
                                        }, void 0, false, {
                                            fileName: "[project]/sottovento/components/hero.tsx",
                                            lineNumber: 73,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "text-xs md:text-sm text-muted-foreground tracking-wide",
                                            children: "Rated Service"
                                        }, void 0, false, {
                                            fileName: "[project]/sottovento/components/hero.tsx",
                                            lineNumber: 74,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/sottovento/components/hero.tsx",
                                    lineNumber: 72,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/sottovento/components/hero.tsx",
                            lineNumber: 63,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/sottovento/components/hero.tsx",
                    lineNumber: 21,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/sottovento/components/hero.tsx",
                lineNumber: 20,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "w-6 h-10 border-2 border-primary rounded-full flex items-start justify-center p-2",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "w-1 h-2 bg-primary rounded-full"
                    }, void 0, false, {
                        fileName: "[project]/sottovento/components/hero.tsx",
                        lineNumber: 83,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/sottovento/components/hero.tsx",
                    lineNumber: 82,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/sottovento/components/hero.tsx",
                lineNumber: 81,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/sottovento/components/hero.tsx",
        lineNumber: 7,
        columnNumber: 5
    }, this);
}
_c = Hero;
var _c;
__turbopack_context__.k.register(_c, "Hero");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/sottovento/hooks/useAttribution.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "buildAttributionMetadata",
    ()=>buildAttributionMetadata,
    "useAttribution",
    ()=>useAttribution
]);
// ============================================================
// SLN Attribution Hook v1.0
// hooks/useAttribution.ts
//
// Captures, persists, and restores attribution parameters
// across the entire booking funnel.
//
// Priority order (mirrors lead-origin.ts spec §5):
//   1. URL params (highest — always override stored)
//   2. sessionStorage (same session, survives page reload)
//   3. localStorage (cross-session, 30-day TTL)
//   4. Empty defaults (organic/direct)
//
// Parameters tracked:
//   ref      — driver referral code (e.g. YHV001)
//   driver   — driver code alias (same as ref in most flows)
//   tablet   — tablet kiosk code (e.g. TAB-SV-012)
//   qr       — QR code identifier (e.g. QR-SV-003)
//   partner  — partner reference (e.g. HOTEL-HYATT-01)
//   campaign — campaign ID (e.g. GOOGLE-MCO-DISNEY)
//   utm_source, utm_medium, utm_campaign — UTM params
//   package  — service package preset
//   service  — service type preset
// ============================================================
var __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sottovento/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
"use client";
;
const STORAGE_KEY = "sln_attribution_v1";
const SESSION_KEY = "sln_attribution_session_v1";
const TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days
;
const DEFAULT_ATTRIBUTION = {
    ref: "",
    driver: "",
    tablet: "",
    qr: "",
    partner: "",
    campaign: "",
    utm_source: "",
    utm_medium: "",
    utm_campaign: "",
    package: "",
    service: "",
    source_channel: "organic",
    captured_at: "",
    landing_page: ""
};
function deriveChannel(params) {
    if (params.ref || params.driver) return "driver_direct";
    if (params.tablet) return "tablet";
    if (params.qr) return "qr";
    if (params.partner) return "partner";
    if (params.campaign || params.utm_campaign) return "campaign";
    if (params.utm_source) return "direct";
    return "organic";
}
function readFromStorage() {
    try {
        // sessionStorage first (same session)
        const session = sessionStorage.getItem(SESSION_KEY);
        if (session) {
            const parsed = JSON.parse(session);
            return parsed;
        }
        // localStorage fallback (cross-session with TTL)
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            const ts = parsed._ts ?? 0;
            if (Date.now() - ts < TTL_MS) {
                return parsed;
            }
            // Expired — clean up
            localStorage.removeItem(STORAGE_KEY);
        }
    } catch  {
    // Storage not available (SSR or private mode)
    }
    return null;
}
function writeToStorage(data) {
    try {
        const payload = {
            ...data,
            _ts: Date.now()
        };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch  {
    // Storage not available
    }
}
function parseUrlParams() {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    try {
        const params = new URLSearchParams(window.location.search);
        // Also check hash params (e.g. /#booking?ref=YHV001)
        const hash = window.location.hash;
        const hashQuery = hash.includes("?") ? hash.split("?")[1] : "";
        const hashParams = new URLSearchParams(hashQuery);
        const get = (key)=>params.get(key) || hashParams.get(key) || "";
        const ref = get("ref");
        const driver = get("driver");
        const tablet = get("tablet");
        const qr = get("qr");
        const partner = get("partner");
        const campaign = get("campaign");
        const utm_source = get("utm_source");
        const utm_medium = get("utm_medium");
        const utm_campaign = get("utm_campaign");
        const pkg = get("package");
        const service = get("service");
        const hasAnyParam = ref || driver || tablet || qr || partner || campaign || utm_source || utm_medium || utm_campaign || pkg || service;
        if (!hasAnyParam) return null;
        return {
            ref,
            driver,
            tablet,
            qr,
            partner,
            campaign,
            utm_source,
            utm_medium,
            utm_campaign,
            package: pkg,
            service
        };
    } catch  {
        return null;
    }
}
function useAttribution() {
    _s();
    const [attribution, setAttribution] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(DEFAULT_ATTRIBUTION);
    const resolve = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useAttribution.useCallback[resolve]": ()=>{
            const urlParams = parseUrlParams();
            const stored = readFromStorage();
            let resolved;
            if (urlParams && Object.values(urlParams).some(Boolean)) {
                // URL params always win — fresh attribution signal
                resolved = {
                    ...DEFAULT_ATTRIBUTION,
                    ...urlParams,
                    source_channel: deriveChannel(urlParams),
                    captured_at: new Date().toISOString(),
                    landing_page: ("TURBOPACK compile-time truthy", 1) ? window.location.href : "TURBOPACK unreachable"
                };
                writeToStorage(resolved);
            } else if (stored) {
                // Restore from storage (session or local)
                resolved = {
                    ...DEFAULT_ATTRIBUTION,
                    ...stored
                };
            } else {
                // No attribution — organic/direct
                resolved = {
                    ...DEFAULT_ATTRIBUTION,
                    source_channel: "organic",
                    captured_at: new Date().toISOString(),
                    landing_page: ("TURBOPACK compile-time truthy", 1) ? window.location.href : "TURBOPACK unreachable"
                };
            }
            setAttribution(resolved);
        }
    }["useAttribution.useCallback[resolve]"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useAttribution.useEffect": ()=>{
            resolve();
        }
    }["useAttribution.useEffect"], [
        resolve
    ]);
    return attribution;
}
_s(useAttribution, "riq+0HIUJvc3jb1a6bzkTq4GGGo=");
function buildAttributionMetadata(attr) {
    return {
        // Core SLN fields
        source_ref: attr.ref || attr.driver || "",
        source_tablet: attr.tablet || "",
        source_qr: attr.qr || "",
        source_partner: attr.partner || "",
        source_campaign: attr.campaign || attr.utm_campaign || "",
        source_channel: attr.source_channel,
        // UTM
        utm_source: attr.utm_source || "",
        utm_medium: attr.utm_medium || "",
        utm_campaign: attr.utm_campaign || "",
        // Booking presets
        booking_package: attr.package || "",
        booking_service: attr.service || "",
        // Audit trail
        attribution_captured_at: attr.captured_at || "",
        attribution_landing_page: attr.landing_page?.substring(0, 500) || "",
        // Legacy fields (backward compat with existing webhook)
        captured_by: attr.ref || attr.driver || attr.tablet || "public_site",
        booking_origin: attr.tablet ? "tablet" : attr.qr ? "qr" : attr.ref || attr.driver ? "driver_referral" : "website"
    };
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/sottovento/lib/zones.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PACKAGE_TO_ZONE",
    ()=>PACKAGE_TO_ZONE,
    "ZONES",
    ()=>ZONES
]);
const ZONES = [
    {
        id: "MCO",
        label: "MCO Airport"
    },
    {
        id: "DISNEY",
        label: "Disney / Lake Buena Vista"
    },
    {
        id: "UNIVERSAL_IDRIVE",
        label: "Universal / I-Drive / Convention Center"
    },
    {
        id: "DOWNTOWN",
        label: "Downtown Orlando / Dr. Phillips / Mall at Millenia"
    },
    {
        id: "KISSIMMEE",
        label: "Kissimmee / Celebration / Reunion"
    },
    {
        id: "NORTH_ORLANDO",
        label: "Winter Park / Maitland / Lake Mary / Longwood"
    },
    {
        id: "LAKE_NONA",
        label: "Lake Nona / Medical City"
    },
    {
        id: "SFB",
        label: "Sanford (SFB) Airport"
    },
    {
        id: "PORT_CANAVERAL",
        label: "Port Canaveral"
    },
    {
        id: "KENNEDY",
        label: "Kennedy Space Center / Cape Canaveral"
    },
    {
        id: "TAMPA",
        label: "Tampa / Downtown Tampa"
    },
    {
        id: "CLEARWATER",
        label: "Clearwater Beach"
    },
    {
        id: "MIAMI",
        label: "Miami / Miami Beach"
    }
];
const PACKAGE_TO_ZONE = {
    mco: "MCO",
    disney: "DISNEY",
    universal: "UNIVERSAL_IDRIVE",
    downtown: "DOWNTOWN",
    kissimmee: "KISSIMMEE",
    north: "NORTH_ORLANDO",
    sfb: "SFB",
    port: "PORT_CANAVERAL",
    kennedy: "KENNEDY",
    tampa: "TAMPA",
    clearwater: "CLEARWATER",
    miami: "MIAMI",
    lakenona: "LAKE_NONA",
    lake_nona: "LAKE_NONA"
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/sottovento/lib/pricing.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "EXTRA_STOP_ADDONS",
    ()=>EXTRA_STOP_ADDONS,
    "EXTRA_STOP_LABELS",
    ()=>EXTRA_STOP_LABELS,
    "FALLBACK_FARE",
    ()=>FALLBACK_FARE,
    "HOURLY_PACKAGES",
    ()=>HOURLY_PACKAGES,
    "HOURLY_RATE",
    ()=>HOURLY_RATE,
    "INTRA_ZONE_FARE",
    ()=>INTRA_ZONE_FARE,
    "MINIMUM_FARE",
    ()=>MINIMUM_FARE,
    "UPGRADE_ADDON",
    ()=>UPGRADE_ADDON,
    "WAIT_ADDONS",
    ()=>WAIT_ADDONS,
    "getGuaranteedPrice",
    ()=>getGuaranteedPrice,
    "getPriceResolutionWithAddons",
    ()=>getPriceResolutionWithAddons,
    "isInServiceArea",
    ()=>isInServiceArea,
    "resolvePrice",
    ()=>resolvePrice
]);
const key = (a, b)=>`${a}->${b}`;
// ============================================================
// LEVEL 1 — EXACT ROUTE LOOKUP (predefined zone-pair prices)
// ============================================================
/** One-way prices */ const PRICES_ONEWAY = {
    // MCO ↔ Core Tourist Zones
    [key("MCO", "DISNEY")]: {
        Sedan: 95,
        SUV: 120
    },
    [key("MCO", "UNIVERSAL_IDRIVE")]: {
        Sedan: 95,
        SUV: 120
    },
    [key("MCO", "DOWNTOWN")]: {
        Sedan: 90,
        SUV: 110
    },
    [key("MCO", "KISSIMMEE")]: {
        Sedan: 95,
        SUV: 120
    },
    [key("MCO", "NORTH_ORLANDO")]: {
        Sedan: 100,
        SUV: 130
    },
    [key("MCO", "LAKE_NONA")]: {
        Sedan: 65,
        SUV: 85
    },
    // SFB ↔ zones
    [key("SFB", "DOWNTOWN")]: {
        Sedan: 90,
        SUV: 115
    },
    [key("SFB", "NORTH_ORLANDO")]: {
        Sedan: 80,
        SUV: 105
    },
    [key("SFB", "MCO")]: {
        Sedan: 110,
        SUV: 140
    },
    [key("SFB", "DISNEY")]: {
        Sedan: 110,
        SUV: 140
    },
    [key("SFB", "UNIVERSAL_IDRIVE")]: {
        Sedan: 110,
        SUV: 140
    },
    [key("SFB", "LAKE_NONA")]: {
        Sedan: 95,
        SUV: 120
    },
    // Port Canaveral
    [key("MCO", "PORT_CANAVERAL")]: {
        Sedan: 145,
        SUV: 180
    },
    [key("DISNEY", "PORT_CANAVERAL")]: {
        Sedan: 155,
        SUV: 190
    },
    [key("UNIVERSAL_IDRIVE", "PORT_CANAVERAL")]: {
        Sedan: 155,
        SUV: 190
    },
    [key("DOWNTOWN", "PORT_CANAVERAL")]: {
        Sedan: 145,
        SUV: 180
    },
    [key("KISSIMMEE", "PORT_CANAVERAL")]: {
        Sedan: 155,
        SUV: 195
    },
    [key("SFB", "PORT_CANAVERAL")]: {
        Sedan: 165,
        SUV: 205
    },
    [key("NORTH_ORLANDO", "PORT_CANAVERAL")]: {
        Sedan: 155,
        SUV: 195
    },
    // Between Tourist Zones
    [key("DISNEY", "UNIVERSAL_IDRIVE")]: {
        Sedan: 75,
        SUV: 100
    },
    [key("DISNEY", "DOWNTOWN")]: {
        Sedan: 75,
        SUV: 100
    },
    [key("UNIVERSAL_IDRIVE", "DOWNTOWN")]: {
        Sedan: 65,
        SUV: 90
    },
    [key("DISNEY", "KISSIMMEE")]: {
        Sedan: 60,
        SUV: 85
    },
    [key("UNIVERSAL_IDRIVE", "KISSIMMEE")]: {
        Sedan: 75,
        SUV: 100
    },
    [key("DOWNTOWN", "KISSIMMEE")]: {
        Sedan: 65,
        SUV: 90
    },
    [key("DOWNTOWN", "NORTH_ORLANDO")]: {
        Sedan: 65,
        SUV: 90
    },
    [key("DOWNTOWN", "LAKE_NONA")]: {
        Sedan: 65,
        SUV: 85
    },
    [key("NORTH_ORLANDO", "UNIVERSAL_IDRIVE")]: {
        Sedan: 75,
        SUV: 100
    },
    [key("NORTH_ORLANDO", "DISNEY")]: {
        Sedan: 85,
        SUV: 110
    },
    [key("NORTH_ORLANDO", "KISSIMMEE")]: {
        Sedan: 85,
        SUV: 110
    },
    [key("LAKE_NONA", "DISNEY")]: {
        Sedan: 75,
        SUV: 100
    },
    [key("LAKE_NONA", "KISSIMMEE")]: {
        Sedan: 65,
        SUV: 85
    },
    [key("LAKE_NONA", "UNIVERSAL_IDRIVE")]: {
        Sedan: 85,
        SUV: 110
    },
    // Kennedy Space Center
    [key("MCO", "KENNEDY")]: {
        Sedan: 165,
        SUV: 210
    },
    [key("DISNEY", "KENNEDY")]: {
        Sedan: 175,
        SUV: 220
    },
    [key("UNIVERSAL_IDRIVE", "KENNEDY")]: {
        Sedan: 175,
        SUV: 220
    },
    [key("DOWNTOWN", "KENNEDY")]: {
        Sedan: 165,
        SUV: 210
    },
    [key("KISSIMMEE", "KENNEDY")]: {
        Sedan: 175,
        SUV: 220
    },
    [key("PORT_CANAVERAL", "KENNEDY")]: {
        Sedan: 65,
        SUV: 85
    },
    [key("SFB", "KENNEDY")]: {
        Sedan: 155,
        SUV: 195
    },
    // Tampa
    [key("MCO", "TAMPA")]: {
        Sedan: 250,
        SUV: 320
    },
    [key("DISNEY", "TAMPA")]: {
        Sedan: 240,
        SUV: 305
    },
    [key("UNIVERSAL_IDRIVE", "TAMPA")]: {
        Sedan: 240,
        SUV: 305
    },
    [key("DOWNTOWN", "TAMPA")]: {
        Sedan: 250,
        SUV: 320
    },
    [key("KISSIMMEE", "TAMPA")]: {
        Sedan: 250,
        SUV: 320
    },
    [key("SFB", "TAMPA")]: {
        Sedan: 275,
        SUV: 350
    },
    // Clearwater Beach
    [key("MCO", "CLEARWATER")]: {
        Sedan: 275,
        SUV: 350
    },
    [key("DISNEY", "CLEARWATER")]: {
        Sedan: 265,
        SUV: 335
    },
    [key("UNIVERSAL_IDRIVE", "CLEARWATER")]: {
        Sedan: 265,
        SUV: 335
    },
    [key("DOWNTOWN", "CLEARWATER")]: {
        Sedan: 275,
        SUV: 350
    },
    [key("KISSIMMEE", "CLEARWATER")]: {
        Sedan: 275,
        SUV: 350
    },
    [key("TAMPA", "CLEARWATER")]: {
        Sedan: 80,
        SUV: 105
    },
    [key("SFB", "CLEARWATER")]: {
        Sedan: 295,
        SUV: 375
    },
    // Miami
    [key("MCO", "MIAMI")]: {
        Sedan: 610,
        SUV: 780
    },
    [key("DISNEY", "MIAMI")]: {
        Sedan: 625,
        SUV: 795
    },
    [key("UNIVERSAL_IDRIVE", "MIAMI")]: {
        Sedan: 625,
        SUV: 795
    },
    [key("DOWNTOWN", "MIAMI")]: {
        Sedan: 610,
        SUV: 780
    },
    [key("KISSIMMEE", "MIAMI")]: {
        Sedan: 625,
        SUV: 795
    },
    [key("PORT_CANAVERAL", "MIAMI")]: {
        Sedan: 595,
        SUV: 760
    },
    [key("SFB", "MIAMI")]: {
        Sedan: 650,
        SUV: 830
    },
    [key("KENNEDY", "MIAMI")]: {
        Sedan: 560,
        SUV: 715
    },
    [key("TAMPA", "MIAMI")]: {
        Sedan: 490,
        SUV: 625
    }
};
/** Round-trip explicit prices */ const ROUNDTRIP_EXPLICIT = {
    [key("MCO", "DISNEY")]: {
        Sedan: 175,
        SUV: 220
    },
    [key("MCO", "UNIVERSAL_IDRIVE")]: {
        Sedan: 175,
        SUV: 220
    },
    [key("MCO", "DOWNTOWN")]: {
        Sedan: 165,
        SUV: 200
    },
    [key("MCO", "PORT_CANAVERAL")]: {
        Sedan: 270,
        SUV: 340
    },
    [key("MCO", "KENNEDY")]: {
        Sedan: 305,
        SUV: 390
    },
    [key("MCO", "TAMPA")]: {
        Sedan: 470,
        SUV: 600
    },
    [key("MCO", "CLEARWATER")]: {
        Sedan: 510,
        SUV: 650
    },
    [key("MCO", "MIAMI")]: {
        Sedan: 1140,
        SUV: 1450
    }
};
// ============================================================
// LEVEL 2 — ZONE-TO-ZONE PRICING (inter-zone fares)
// These cover short urban inter-zone routes not in exact table
// ============================================================
const ZONE_TO_ZONE_FARES = {
    // Downtown ↔ neighbors
    [key("DOWNTOWN", "UNIVERSAL_IDRIVE")]: {
        Sedan: 75,
        SUV: 100
    },
    [key("DOWNTOWN", "NORTH_ORLANDO")]: {
        Sedan: 65,
        SUV: 90
    },
    [key("DOWNTOWN", "LAKE_NONA")]: {
        Sedan: 65,
        SUV: 85
    },
    [key("DOWNTOWN", "KISSIMMEE")]: {
        Sedan: 65,
        SUV: 90
    },
    [key("DOWNTOWN", "DISNEY")]: {
        Sedan: 75,
        SUV: 100
    },
    [key("DOWNTOWN", "MCO")]: {
        Sedan: 90,
        SUV: 110
    },
    // North Orlando ↔ neighbors
    [key("NORTH_ORLANDO", "MCO")]: {
        Sedan: 100,
        SUV: 130
    },
    [key("NORTH_ORLANDO", "DOWNTOWN")]: {
        Sedan: 65,
        SUV: 90
    },
    [key("NORTH_ORLANDO", "UNIVERSAL_IDRIVE")]: {
        Sedan: 75,
        SUV: 100
    },
    [key("NORTH_ORLANDO", "DISNEY")]: {
        Sedan: 85,
        SUV: 110
    },
    [key("NORTH_ORLANDO", "KISSIMMEE")]: {
        Sedan: 85,
        SUV: 110
    },
    // Lake Nona ↔ neighbors
    [key("LAKE_NONA", "MCO")]: {
        Sedan: 65,
        SUV: 85
    },
    [key("LAKE_NONA", "DOWNTOWN")]: {
        Sedan: 65,
        SUV: 85
    },
    [key("LAKE_NONA", "DISNEY")]: {
        Sedan: 75,
        SUV: 100
    },
    [key("LAKE_NONA", "KISSIMMEE")]: {
        Sedan: 65,
        SUV: 85
    },
    [key("LAKE_NONA", "UNIVERSAL_IDRIVE")]: {
        Sedan: 85,
        SUV: 110
    },
    [key("LAKE_NONA", "NORTH_ORLANDO")]: {
        Sedan: 80,
        SUV: 105
    },
    // Kissimmee ↔ neighbors
    [key("KISSIMMEE", "DISNEY")]: {
        Sedan: 60,
        SUV: 85
    },
    [key("KISSIMMEE", "UNIVERSAL_IDRIVE")]: {
        Sedan: 75,
        SUV: 100
    },
    [key("KISSIMMEE", "DOWNTOWN")]: {
        Sedan: 65,
        SUV: 90
    },
    [key("KISSIMMEE", "MCO")]: {
        Sedan: 95,
        SUV: 120
    },
    // Universal/IDrive ↔ neighbors
    [key("UNIVERSAL_IDRIVE", "DISNEY")]: {
        Sedan: 75,
        SUV: 100
    },
    [key("UNIVERSAL_IDRIVE", "DOWNTOWN")]: {
        Sedan: 65,
        SUV: 90
    },
    [key("UNIVERSAL_IDRIVE", "KISSIMMEE")]: {
        Sedan: 75,
        SUV: 100
    },
    [key("UNIVERSAL_IDRIVE", "MCO")]: {
        Sedan: 95,
        SUV: 120
    }
};
const INTRA_ZONE_FARE = {
    Sedan: 45,
    SUV: 65,
    "Luxury SUV": 95,
    Sprinter: 160
};
const FALLBACK_FARE = {
    Sedan: 95,
    SUV: 120,
    "Luxury SUV": 145,
    Sprinter: 220
};
// ============================================================
// SERVICE AREA — zones we can service
// ============================================================
const SERVICE_AREA_ZONES = new Set([
    "MCO",
    "DISNEY",
    "UNIVERSAL_IDRIVE",
    "DOWNTOWN",
    "KISSIMMEE",
    "NORTH_ORLANDO",
    "SFB",
    "PORT_CANAVERAL",
    "KENNEDY",
    "TAMPA",
    "CLEARWATER",
    "MIAMI",
    "LAKE_NONA"
]);
function isInServiceArea(zone) {
    return SERVICE_AREA_ZONES.has(zone);
}
const MINIMUM_FARE = {
    Sedan: 45,
    SUV: 65,
    "Luxury SUV": 95,
    Sprinter: 160
};
const WAIT_ADDONS = {
    none: 0,
    "2h": 80,
    "4h": 150,
    fullday: 350
};
const EXTRA_STOP_ADDONS = {
    none: 0,
    quick: 15,
    short: 25,
    extended: 40
};
const EXTRA_STOP_LABELS = {
    none: "No extra stop",
    quick: "Quick stop (10 min) +$15",
    short: "Short stop (20 min) +$25",
    extended: "Extended stop (40 min) +$40"
};
const UPGRADE_ADDON = 35;
const HOURLY_PACKAGES = [
    {
        label: "3 hours (minimum) — $285",
        hours: 3,
        price: 285
    },
    {
        label: "5 hours — $450",
        hours: 5,
        price: 450
    },
    {
        label: "8 hours — $720",
        hours: 8,
        price: 720
    }
];
const HOURLY_RATE = 95; // per hour
// ============================================================
// INTERNAL HELPERS
// ============================================================
// ── Luxury multipliers for Luxury SUV and Sprinter ──────────
const LUXURY_MULTIPLIER = {
    "Luxury SUV": 1.45,
    Sprinter: 2.0
};
function getExactPair(pickup, dropoff, table) {
    const direct = table[key(pickup, dropoff)];
    if (direct) return direct;
    const reverse = table[key(dropoff, pickup)];
    if (reverse) return reverse;
    return null;
}
function resolvePrice(args) {
    const { pickupZone, dropoffZone, vehicle, serviceType = "oneway" } = args;
    // ── Luxury SUV / Sprinter: resolve as SUV then apply multiplier ──
    const luxMultiplier = LUXURY_MULTIPLIER[vehicle];
    if (luxMultiplier) {
        const baseResolution = resolvePrice({
            pickupZone,
            dropoffZone,
            vehicle: "SUV",
            serviceType
        });
        if (baseResolution.price === null) return baseResolution;
        return {
            ...baseResolution,
            price: Math.round(baseResolution.price * luxMultiplier / 5) * 5
        };
    }
    // ── Service area check ───────────────────────────────────
    if (!isInServiceArea(pickupZone) || !isInServiceArea(dropoffZone)) {
        return {
            type: "out_of_area",
            price: null
        };
    }
    // ── Level 1: Exact route ─────────────────────────────────
    if (serviceType === "roundtrip") {
        const rtPair = getExactPair(pickupZone, dropoffZone, ROUNDTRIP_EXPLICIT);
        if (rtPair) return {
            type: "exact_route",
            price: rtPair[vehicle]
        };
        // Fallback: 1.85x one-way
        const owPair = getExactPair(pickupZone, dropoffZone, PRICES_ONEWAY);
        if (owPair) {
            const rtPrice = Math.round(owPair[vehicle] * 1.85 / 5) * 5;
            return {
                type: "exact_route",
                price: rtPrice
            };
        }
    } else {
        const owPair = getExactPair(pickupZone, dropoffZone, PRICES_ONEWAY);
        if (owPair) return {
            type: "exact_route",
            price: owPair[vehicle]
        };
    }
    // ── Level 2: Zone-to-zone ────────────────────────────────
    const z2zPair = getExactPair(pickupZone, dropoffZone, ZONE_TO_ZONE_FARES);
    if (z2zPair) {
        const price = serviceType === "roundtrip" ? Math.round(z2zPair[vehicle] * 1.85 / 5) * 5 : z2zPair[vehicle];
        return {
            type: "zone_to_zone",
            price
        };
    }
    // ── Level 3: Intra-zone (same zone) ─────────────────────
    if (pickupZone === dropoffZone) {
        const price = serviceType === "roundtrip" ? Math.round(INTRA_ZONE_FARE[vehicle] * 1.85 / 5) * 5 : INTRA_ZONE_FARE[vehicle];
        return {
            type: "intra_zone",
            price
        };
    }
    // ── Level 4: Global fallback ─────────────────────────────
    const price = serviceType === "roundtrip" ? Math.round(FALLBACK_FARE[vehicle] * 1.85 / 5) * 5 : FALLBACK_FARE[vehicle];
    return {
        type: "fallback",
        price
    };
}
function getGuaranteedPrice(args) {
    const { pickupZone, dropoffZone, vehicle, serviceType = "oneway", waitTime = "none", extraStop = "none", upgrade = false } = args;
    // Effective vehicle after upgrade
    const effectiveVehicle = upgrade && vehicle === "Sedan" ? "SUV" : vehicle;
    const resolution = resolvePrice({
        pickupZone,
        dropoffZone,
        vehicle: effectiveVehicle,
        serviceType
    });
    if (resolution.price === null) return null;
    const base = resolution.price;
    const waitAddon = WAIT_ADDONS[waitTime] ?? 0;
    const stopAddon = EXTRA_STOP_ADDONS[extraStop] ?? 0;
    const upgradeAddon = upgrade && vehicle === "Sedan" ? UPGRADE_ADDON : 0;
    const total = base + waitAddon + stopAddon + upgradeAddon;
    // Apply minimum fare
    const minFare = MINIMUM_FARE[effectiveVehicle];
    return Math.max(total, minFare);
}
function getPriceResolutionWithAddons(args) {
    const { pickupZone, dropoffZone, vehicle, serviceType = "oneway", waitTime = "none", extraStop = "none", upgrade = false } = args;
    const effectiveVehicle = upgrade && vehicle === "Sedan" ? "SUV" : vehicle;
    const resolution = resolvePrice({
        pickupZone,
        dropoffZone,
        vehicle: effectiveVehicle,
        serviceType
    });
    if (resolution.price === null) {
        return {
            resolution,
            finalPrice: null
        };
    }
    const waitAddon = WAIT_ADDONS[waitTime] ?? 0;
    const stopAddon = EXTRA_STOP_ADDONS[extraStop] ?? 0;
    const upgradeAddon = upgrade && vehicle === "Sedan" ? UPGRADE_ADDON : 0;
    const total = resolution.price + waitAddon + stopAddon + upgradeAddon;
    const minFare = MINIMUM_FARE[effectiveVehicle];
    const finalPrice = Math.max(total, minFare);
    return {
        resolution,
        finalPrice
    };
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/sottovento/components/places-autocomplete.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PlacesAutocomplete",
    ()=>PlacesAutocomplete
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sottovento/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sottovento/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
const GOLD = "#C9A84C";
const labelStyle = {
    fontSize: 16,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 6,
    display: "block"
};
function PlacesAutocomplete({ id, value, placeholder, label, disabled, onSelect, onChange, mapsLoaded, zoneWarning, zoneMatch }) {
    _s();
    const [inputValue, setInputValue] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(value);
    const [predictions, setPredictions] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [showDropdown, setShowDropdown] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [activeIndex, setActiveIndex] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(-1);
    const [focused, setFocused] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const serviceRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const geocoderRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const debounceRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const containerRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const inputRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const onSelectRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(onSelect);
    onSelectRef.current = onSelect;
    // Sync external value changes
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "PlacesAutocomplete.useEffect": ()=>{
            setInputValue(value);
        }
    }["PlacesAutocomplete.useEffect"], [
        value
    ]);
    // Initialize AutocompleteService and Geocoder once Maps API is ready
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "PlacesAutocomplete.useEffect": ()=>{
            if (!mapsLoaded) return;
            if (serviceRef.current) return;
            try {
                serviceRef.current = new window.google.maps.places.AutocompleteService();
                geocoderRef.current = new window.google.maps.Geocoder();
            } catch (err) {
                console.error("[PlacesAutocomplete] Failed to initialize service:", err);
            }
        }
    }["PlacesAutocomplete.useEffect"], [
        mapsLoaded
    ]);
    // Close dropdown when clicking outside
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "PlacesAutocomplete.useEffect": ()=>{
            const handleClickOutside = {
                "PlacesAutocomplete.useEffect.handleClickOutside": (e)=>{
                    if (containerRef.current && !containerRef.current.contains(e.target)) {
                        setShowDropdown(false);
                        setActiveIndex(-1);
                    }
                }
            }["PlacesAutocomplete.useEffect.handleClickOutside"];
            document.addEventListener("mousedown", handleClickOutside);
            return ({
                "PlacesAutocomplete.useEffect": ()=>document.removeEventListener("mousedown", handleClickOutside)
            })["PlacesAutocomplete.useEffect"];
        }
    }["PlacesAutocomplete.useEffect"], []);
    const fetchPredictions = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "PlacesAutocomplete.useCallback[fetchPredictions]": (query)=>{
            if (!serviceRef.current || query.length < 2) {
                setPredictions([]);
                setShowDropdown(false);
                return;
            }
            setLoading(true);
            serviceRef.current.getPlacePredictions({
                input: query,
                componentRestrictions: {
                    country: "us"
                },
                types: [
                    "establishment",
                    "geocode"
                ]
            }, {
                "PlacesAutocomplete.useCallback[fetchPredictions]": (results, status)=>{
                    setLoading(false);
                    if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
                        const preds = results.map({
                            "PlacesAutocomplete.useCallback[fetchPredictions].preds": (r)=>({
                                    placeId: r.place_id,
                                    description: r.description,
                                    mainText: r.structured_formatting.main_text,
                                    secondaryText: r.structured_formatting.secondary_text || ""
                                })
                        }["PlacesAutocomplete.useCallback[fetchPredictions].preds"]);
                        setPredictions(preds);
                        setShowDropdown(true);
                        setActiveIndex(-1);
                    } else {
                        setPredictions([]);
                        setShowDropdown(false);
                    }
                }
            }["PlacesAutocomplete.useCallback[fetchPredictions]"]);
        }
    }["PlacesAutocomplete.useCallback[fetchPredictions]"], []);
    const handleInputChange = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "PlacesAutocomplete.useCallback[handleInputChange]": (e)=>{
            const val = e.target.value;
            setInputValue(val);
            onChange?.(val);
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout({
                "PlacesAutocomplete.useCallback[handleInputChange]": ()=>{
                    fetchPredictions(val);
                }
            }["PlacesAutocomplete.useCallback[handleInputChange]"], 250);
        }
    }["PlacesAutocomplete.useCallback[handleInputChange]"], [
        onChange,
        fetchPredictions
    ]);
    const handleSelect = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "PlacesAutocomplete.useCallback[handleSelect]": async (prediction)=>{
            setInputValue(prediction.description);
            setShowDropdown(false);
            setPredictions([]);
            setActiveIndex(-1);
            onChange?.(prediction.description);
            if (!geocoderRef.current) return;
            try {
                geocoderRef.current.geocode({
                    placeId: prediction.placeId
                }, {
                    "PlacesAutocomplete.useCallback[handleSelect]": (results, status)=>{
                        if (status === window.google.maps.GeocoderStatus.OK && results?.[0]) {
                            const loc = results[0].geometry.location;
                            onSelectRef.current({
                                formattedAddress: results[0].formatted_address,
                                lat: loc.lat(),
                                lng: loc.lng(),
                                placeId: prediction.placeId
                            });
                        }
                    }
                }["PlacesAutocomplete.useCallback[handleSelect]"]);
            } catch (err) {
                console.error("[PlacesAutocomplete] Geocode error:", err);
            }
        }
    }["PlacesAutocomplete.useCallback[handleSelect]"], [
        onChange
    ]);
    const handleKeyDown = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "PlacesAutocomplete.useCallback[handleKeyDown]": (e)=>{
            if (!showDropdown || predictions.length === 0) return;
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex({
                    "PlacesAutocomplete.useCallback[handleKeyDown]": (i)=>Math.min(i + 1, predictions.length - 1)
                }["PlacesAutocomplete.useCallback[handleKeyDown]"]);
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex({
                    "PlacesAutocomplete.useCallback[handleKeyDown]": (i)=>Math.max(i - 1, -1)
                }["PlacesAutocomplete.useCallback[handleKeyDown]"]);
            } else if (e.key === "Enter" && activeIndex >= 0) {
                e.preventDefault();
                handleSelect(predictions[activeIndex]);
            } else if (e.key === "Escape") {
                setShowDropdown(false);
                setActiveIndex(-1);
            }
        }
    }["PlacesAutocomplete.useCallback[handleKeyDown]"], [
        showDropdown,
        predictions,
        activeIndex,
        handleSelect
    ]);
    const borderColor = focused ? zoneWarning ? "rgba(239,68,68,0.8)" : `${GOLD}80` : zoneWarning ? "rgba(239,68,68,0.6)" : zoneMatch ? `${GOLD}80` : "rgba(255,255,255,0.15)";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ref: containerRef,
        style: {
            position: "relative"
        },
        children: [
            label && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                htmlFor: id,
                style: labelStyle,
                children: label
            }, void 0, false, {
                fileName: "[project]/sottovento/components/places-autocomplete.tsx",
                lineNumber: 218,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    position: "relative"
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                        ref: inputRef,
                        id: id,
                        type: "text",
                        value: inputValue,
                        onChange: handleInputChange,
                        onKeyDown: handleKeyDown,
                        onFocus: ()=>{
                            setFocused(true);
                            if (inputValue.length >= 2 && predictions.length > 0) {
                                setShowDropdown(true);
                            }
                        },
                        onBlur: ()=>setFocused(false),
                        placeholder: mapsLoaded ? placeholder ?? "Enter address..." : "Loading address search...",
                        disabled: disabled || !mapsLoaded,
                        autoComplete: "off",
                        className: "w-full bg-white/5 border rounded-lg px-4 text-white placeholder-white/30 focus:outline-none transition",
                        style: {
                            fontSize: 18,
                            height: 54,
                            borderColor,
                            outline: "none",
                            opacity: disabled ? 0.5 : 1,
                            paddingRight: loading || zoneMatch ? 40 : 16
                        }
                    }, void 0, false, {
                        fileName: "[project]/sottovento/components/places-autocomplete.tsx",
                        lineNumber: 224,
                        columnNumber: 9
                    }, this),
                    loading && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 animate-spin",
                        style: {
                            borderColor: `${GOLD}40`,
                            borderTopColor: GOLD
                        }
                    }, void 0, false, {
                        fileName: "[project]/sottovento/components/places-autocomplete.tsx",
                        lineNumber: 258,
                        columnNumber: 11
                    }, this),
                    !loading && zoneMatch && mapsLoaded && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold",
                        style: {
                            color: GOLD
                        },
                        children: "✓"
                    }, void 0, false, {
                        fileName: "[project]/sottovento/components/places-autocomplete.tsx",
                        lineNumber: 269,
                        columnNumber: 11
                    }, this),
                    !mapsLoaded && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 animate-spin",
                        style: {
                            borderColor: `${GOLD}40`,
                            borderTopColor: GOLD
                        }
                    }, void 0, false, {
                        fileName: "[project]/sottovento/components/places-autocomplete.tsx",
                        lineNumber: 279,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/sottovento/components/places-autocomplete.tsx",
                lineNumber: 223,
                columnNumber: 7
            }, this),
            showDropdown && predictions.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    zIndex: 99999,
                    backgroundColor: "#111",
                    border: `1px solid rgba(201,168,76,0.35)`,
                    borderRadius: 10,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.7)",
                    marginTop: 4,
                    overflow: "hidden"
                },
                children: [
                    predictions.map((pred, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            onMouseDown: (e)=>{
                                e.preventDefault();
                                handleSelect(pred);
                            },
                            onMouseEnter: ()=>setActiveIndex(index),
                            style: {
                                padding: "11px 14px",
                                cursor: "pointer",
                                backgroundColor: activeIndex === index ? "rgba(201,168,76,0.14)" : "transparent",
                                borderTop: index > 0 ? "1px solid rgba(255,255,255,0.06)" : "none",
                                transition: "background-color 0.15s"
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        color: GOLD,
                                        fontSize: 15,
                                        fontWeight: 500,
                                        lineHeight: 1.4
                                    },
                                    children: pred.mainText
                                }, void 0, false, {
                                    fileName: "[project]/sottovento/components/places-autocomplete.tsx",
                                    lineNumber: 326,
                                    columnNumber: 15
                                }, this),
                                pred.secondaryText && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        color: "rgba(255,255,255,0.45)",
                                        fontSize: 13,
                                        marginTop: 2
                                    },
                                    children: pred.secondaryText
                                }, void 0, false, {
                                    fileName: "[project]/sottovento/components/places-autocomplete.tsx",
                                    lineNumber: 337,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, pred.placeId, true, {
                            fileName: "[project]/sottovento/components/places-autocomplete.tsx",
                            lineNumber: 307,
                            columnNumber: 13
                        }, this)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            padding: "6px 14px",
                            borderTop: "1px solid rgba(255,255,255,0.06)",
                            display: "flex",
                            justifyContent: "flex-end"
                        },
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            style: {
                                color: "rgba(255,255,255,0.2)",
                                fontSize: 11
                            },
                            children: "powered by Google"
                        }, void 0, false, {
                            fileName: "[project]/sottovento/components/places-autocomplete.tsx",
                            lineNumber: 358,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/sottovento/components/places-autocomplete.tsx",
                        lineNumber: 350,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/sottovento/components/places-autocomplete.tsx",
                lineNumber: 291,
                columnNumber: 9
            }, this),
            zoneWarning && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mt-2 rounded-lg px-3 py-2 text-sm leading-snug",
                style: {
                    backgroundColor: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.3)",
                    color: "#fca5a5"
                },
                children: zoneWarning
            }, void 0, false, {
                fileName: "[project]/sottovento/components/places-autocomplete.tsx",
                lineNumber: 367,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/sottovento/components/places-autocomplete.tsx",
        lineNumber: 216,
        columnNumber: 5
    }, this);
}
_s(PlacesAutocomplete, "W1SYuK+DjNe/A8gVs7oVB+bEJCg=");
_c = PlacesAutocomplete;
var _c;
__turbopack_context__.k.register(_c, "PlacesAutocomplete");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/sottovento/components/route-info-display.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "RouteInfoDisplay",
    ()=>RouteInfoDisplay
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sottovento/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
"use client";
;
const GOLD = "#C9A84C";
function RouteInfoDisplay({ status, route, error }) {
    if (status === "idle") return null;
    if (status === "loading") {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "rounded-xl p-4 flex items-center gap-3",
            style: {
                backgroundColor: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)"
            },
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "w-5 h-5 rounded-full border-2 border-t-transparent animate-spin flex-shrink-0",
                    style: {
                        borderColor: `${GOLD}60`,
                        borderTopColor: "transparent"
                    }
                }, void 0, false, {
                    fileName: "[project]/sottovento/components/route-info-display.tsx",
                    lineNumber: 27,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-white/50 text-sm",
                    children: "Calculating route..."
                }, void 0, false, {
                    fileName: "[project]/sottovento/components/route-info-display.tsx",
                    lineNumber: 31,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/sottovento/components/route-info-display.tsx",
            lineNumber: 23,
            columnNumber: 7
        }, this);
    }
    if (status === "error" || error) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "rounded-xl px-4 py-3 text-sm",
            style: {
                backgroundColor: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.25)",
                color: "rgba(252,165,165,0.8)"
            },
            children: "⚠ Could not calculate route. Please verify the addresses."
        }, void 0, false, {
            fileName: "[project]/sottovento/components/route-info-display.tsx",
            lineNumber: 38,
            columnNumber: 7
        }, this);
    }
    if (status === "success" && route) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "rounded-xl p-4",
            style: {
                backgroundColor: `${GOLD}0A`,
                border: `1px solid ${GOLD}30`
            },
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-white/40 text-xs uppercase tracking-widest mb-3",
                    children: "Route Summary"
                }, void 0, false, {
                    fileName: "[project]/sottovento/components/route-info-display.tsx",
                    lineNumber: 57,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "grid grid-cols-2 gap-4",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "text-center",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-white font-light",
                                    style: {
                                        fontSize: 24,
                                        color: GOLD
                                    },
                                    children: [
                                        route.distanceMiles,
                                        " mi"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/sottovento/components/route-info-display.tsx",
                                    lineNumber: 60,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-white/40 text-xs mt-1",
                                    children: "Estimated Distance"
                                }, void 0, false, {
                                    fileName: "[project]/sottovento/components/route-info-display.tsx",
                                    lineNumber: 63,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/sottovento/components/route-info-display.tsx",
                            lineNumber: 59,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "text-center",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-white font-light",
                                    style: {
                                        fontSize: 24,
                                        color: GOLD
                                    },
                                    children: route.durationText
                                }, void 0, false, {
                                    fileName: "[project]/sottovento/components/route-info-display.tsx",
                                    lineNumber: 66,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-white/40 text-xs mt-1",
                                    children: "Estimated Duration"
                                }, void 0, false, {
                                    fileName: "[project]/sottovento/components/route-info-display.tsx",
                                    lineNumber: 69,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/sottovento/components/route-info-display.tsx",
                            lineNumber: 65,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/sottovento/components/route-info-display.tsx",
                    lineNumber: 58,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/sottovento/components/route-info-display.tsx",
            lineNumber: 53,
            columnNumber: 7
        }, this);
    }
    return null;
}
_c = RouteInfoDisplay;
var _c;
__turbopack_context__.k.register(_c, "RouteInfoDisplay");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/sottovento/hooks/useGoogleMapsLoader.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useGoogleMapsLoader",
    ()=>useGoogleMapsLoader
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/sottovento/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sottovento/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
"use client";
;
let moduleState = "idle";
const callbacks = [];
function notifyAll(ready) {
    callbacks.forEach((cb)=>cb(ready));
    callbacks.length = 0;
}
function loadGoogleMaps(apiKey) {
    if (moduleState !== "idle") return;
    moduleState = "loading";
    // Use the new Maps JS API bootstrap with callback
    // v=beta enables PlaceAutocompleteElement (new Places API, required for post-March-2025 keys)
    const callbackName = "__googleMapsInitCallback";
    window[callbackName] = ()=>{
        moduleState = "ready";
        notifyAll(true);
        delete window[callbackName];
    };
    const script = document.createElement("script");
    // v=beta is required to access PlaceAutocompleteElement for new API keys
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&callback=${callbackName}&loading=async&v=beta`;
    script.async = true;
    script.defer = true;
    script.setAttribute("data-gmaps", "sottovento");
    script.onerror = ()=>{
        moduleState = "error";
        notifyAll(false);
    };
    document.head.appendChild(script);
}
function useGoogleMapsLoader() {
    _s();
    const [loaded, setLoaded] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        "useGoogleMapsLoader.useState": ()=>("TURBOPACK compile-time value", "object") !== "undefined" && !!window.google?.maps?.places
    }["useGoogleMapsLoader.useState"]);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useGoogleMapsLoader.useEffect": ()=>{
            // Already ready (e.g. HMR reload with Maps already in window)
            if (window.google?.maps?.places) {
                moduleState = "ready";
                setLoaded(true);
                return;
            }
            if (moduleState === "ready") {
                setLoaded(true);
                return;
            }
            if (moduleState === "error") {
                setError("Google Maps failed to load");
                return;
            }
            // Register callback for when loading completes
            callbacks.push({
                "useGoogleMapsLoader.useEffect": (ready)=>{
                    if (ready) {
                        setLoaded(true);
                    } else {
                        setError("Google Maps failed to load");
                    }
                }
            }["useGoogleMapsLoader.useEffect"]);
            // Trigger load if not already started
            const apiKey = ("TURBOPACK compile-time value", "AIzaSyCLcyE5MjWOJr48g54DkNHOiYzf2XcP1XA");
            if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
            ;
            loadGoogleMaps(apiKey);
        }
    }["useGoogleMapsLoader.useEffect"], []);
    return {
        loaded,
        error
    };
}
_s(useGoogleMapsLoader, "pbwGm1EpjhnqJLyar20wjbu2pNU=");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/sottovento/lib/geo/polygons.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Geographic zone polygons for Sottovento Luxury Ride.
 * Each polygon is defined as an array of [lng, lat] coordinate pairs.
 * Used for zone validation: detecting which zone a geocoded address belongs to.
 *
 * Coordinate system: GeoJSON standard [longitude, latitude]
 */ __turbopack_context__.s([
    "ZONE_POLYGONS",
    ()=>ZONE_POLYGONS
]);
const ZONE_POLYGONS = {
    MCO: [
        [
            -81.3550,
            28.4850
        ],
        [
            -81.3550,
            28.4200
        ],
        [
            -81.2900,
            28.4200
        ],
        [
            -81.2900,
            28.4850
        ],
        [
            -81.3550,
            28.4850
        ]
    ],
    DISNEY: [
        [
            -81.6200,
            28.4200
        ],
        [
            -81.6200,
            28.3400
        ],
        [
            -81.5200,
            28.3400
        ],
        [
            -81.5200,
            28.4200
        ],
        [
            -81.6200,
            28.4200
        ]
    ],
    UNIVERSAL_IDRIVE: [
        [
            -81.5000,
            28.4800
        ],
        [
            -81.5000,
            28.4200
        ],
        [
            -81.4400,
            28.4200
        ],
        [
            -81.4400,
            28.4800
        ],
        [
            -81.5000,
            28.4800
        ]
    ],
    DOWNTOWN: [
        [
            -81.4200,
            28.5600
        ],
        [
            -81.4200,
            28.5000
        ],
        [
            -81.3600,
            28.5000
        ],
        [
            -81.3600,
            28.5600
        ],
        [
            -81.4200,
            28.5600
        ]
    ],
    KISSIMMEE: [
        [
            -81.5200,
            28.3400
        ],
        [
            -81.5200,
            28.2400
        ],
        [
            -81.3800,
            28.2400
        ],
        [
            -81.3800,
            28.3400
        ],
        [
            -81.5200,
            28.3400
        ]
    ],
    NORTH_ORLANDO: [
        [
            -81.4200,
            28.7000
        ],
        [
            -81.4200,
            28.5600
        ],
        [
            -81.2800,
            28.5600
        ],
        [
            -81.2800,
            28.7000
        ],
        [
            -81.4200,
            28.7000
        ]
    ],
    LAKE_NONA: [
        [
            -81.3200,
            28.4200
        ],
        [
            -81.3200,
            28.3500
        ],
        [
            -81.2400,
            28.3500
        ],
        [
            -81.2400,
            28.4200
        ],
        [
            -81.3200,
            28.4200
        ]
    ],
    SFB: [
        [
            -81.2600,
            28.8000
        ],
        [
            -81.2600,
            28.7600
        ],
        [
            -81.2000,
            28.7600
        ],
        [
            -81.2000,
            28.8000
        ],
        [
            -81.2600,
            28.8000
        ]
    ],
    PORT_CANAVERAL: [
        [
            -80.6500,
            28.4200
        ],
        [
            -80.6500,
            28.3800
        ],
        [
            -80.5800,
            28.3800
        ],
        [
            -80.5800,
            28.4200
        ],
        [
            -80.6500,
            28.4200
        ]
    ],
    KENNEDY: [
        [
            -80.7500,
            28.5800
        ],
        [
            -80.7500,
            28.4200
        ],
        [
            -80.5800,
            28.4200
        ],
        [
            -80.5800,
            28.5800
        ],
        [
            -80.7500,
            28.5800
        ]
    ],
    TAMPA: [
        [
            -82.5800,
            28.1000
        ],
        [
            -82.5800,
            27.8500
        ],
        [
            -82.3500,
            27.8500
        ],
        [
            -82.3500,
            28.1000
        ],
        [
            -82.5800,
            28.1000
        ]
    ],
    CLEARWATER: [
        [
            -82.8500,
            28.0200
        ],
        [
            -82.8500,
            27.9200
        ],
        [
            -82.7500,
            27.9200
        ],
        [
            -82.7500,
            28.0200
        ],
        [
            -82.8500,
            28.0200
        ]
    ],
    MIAMI: [
        [
            -80.3200,
            25.9000
        ],
        [
            -80.3200,
            25.6500
        ],
        [
            -80.1200,
            25.6500
        ],
        [
            -80.1200,
            25.9000
        ],
        [
            -80.3200,
            25.9000
        ]
    ]
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/sottovento/lib/geo/utils.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Geographic utility functions for Sottovento Luxury Ride.
 *
 * Implements:
 * - Ray-casting point-in-polygon algorithm (zero external dependencies)
 * - Zone detection from lat/lng coordinates
 * - Route distance/duration calculation via Google Maps Distance Matrix API
 */ __turbopack_context__.s([
    "calculateRoute",
    ()=>calculateRoute,
    "detectZoneFromCoordinates",
    ()=>detectZoneFromCoordinates,
    "pointInPolygon",
    ()=>pointInPolygon
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$lib$2f$geo$2f$polygons$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sottovento/lib/geo/polygons.ts [app-client] (ecmascript)");
;
function pointInPolygon(lng, lat, polygon) {
    let inside = false;
    const n = polygon.length;
    for(let i = 0, j = n - 1; i < n; j = i++){
        const [xi, yi] = polygon[i];
        const [xj, yj] = polygon[j];
        const intersect = yi > lat !== yj > lat && lng < (xj - xi) * (lat - yi) / (yj - yi) + xi;
        if (intersect) inside = !inside;
    }
    return inside;
}
function detectZoneFromCoordinates(lng, lat) {
    for (const [zoneId, polygon] of Object.entries(__TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$lib$2f$geo$2f$polygons$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ZONE_POLYGONS"])){
        if (polygon && pointInPolygon(lng, lat, polygon)) {
            return zoneId;
        }
    }
    return null;
}
function calculateRoute(origin, destination) {
    return new Promise((resolve, reject)=>{
        if (("TURBOPACK compile-time value", "object") === "undefined" || !window.google?.maps) {
            reject(new Error("Google Maps not loaded"));
            return;
        }
        const service = new window.google.maps.DistanceMatrixService();
        service.getDistanceMatrix({
            origins: [
                origin
            ],
            destinations: [
                destination
            ],
            travelMode: window.google.maps.TravelMode.DRIVING,
            unitSystem: window.google.maps.UnitSystem.IMPERIAL
        }, (response, status)=>{
            if (status !== "OK" || !response) {
                reject(new Error(`Distance Matrix failed: ${status}`));
                return;
            }
            const element = response.rows[0]?.elements[0];
            if (!element || element.status !== "OK") {
                reject(new Error("No route found between the two locations"));
                return;
            }
            const distanceMeters = element.distance.value;
            const distanceMiles = distanceMeters / 1609.344;
            const durationMinutes = Math.ceil(element.duration.value / 60);
            resolve({
                distanceMiles: Math.round(distanceMiles * 10) / 10,
                distanceText: element.distance.text,
                durationMinutes,
                durationText: element.duration.text
            });
        });
    });
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/sottovento/hooks/useZoneValidation.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useZoneValidation",
    ()=>useZoneValidation
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sottovento/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$lib$2f$zones$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sottovento/lib/zones.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$lib$2f$geo$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sottovento/lib/geo/utils.ts [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
function useZoneValidation() {
    _s();
    const validateZone = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useZoneValidation.useCallback[validateZone]": (selectedZone, lat, lng, fieldLabel)=>{
            const detectedZone = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$lib$2f$geo$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["detectZoneFromCoordinates"])(lng, lat);
            if (!detectedZone) {
                // Address is outside all defined polygons — cannot contradict the selection
                return {
                    detectedZone: null,
                    isMatch: true,
                    warningMessage: null,
                    detectedZoneLabel: null
                };
            }
            const detectedZoneLabel = __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$lib$2f$zones$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ZONES"].find({
                "useZoneValidation.useCallback[validateZone]": (z)=>z.id === detectedZone
            }["useZoneValidation.useCallback[validateZone]"])?.label ?? detectedZone;
            if (!selectedZone || selectedZone === detectedZone) {
                return {
                    detectedZone,
                    isMatch: true,
                    warningMessage: null,
                    detectedZoneLabel
                };
            }
            // Mismatch detected — build warning message
            const fieldName = fieldLabel === "pickup" ? "Pickup" : "Drop-off";
            return {
                detectedZone,
                isMatch: false,
                warningMessage: `${fieldName} address is in ${detectedZoneLabel}. Zone updated automatically — price adjusted.`,
                detectedZoneLabel
            };
        }
    }["useZoneValidation.useCallback[validateZone]"], []);
    return {
        validateZone
    };
}
_s(useZoneValidation, "AdInJaAJzCp8twVm9h2gVU9XtJY=");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/sottovento/hooks/useRouteCalculator.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useRouteCalculator",
    ()=>useRouteCalculator
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sottovento/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$lib$2f$geo$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sottovento/lib/geo/utils.ts [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
"use client";
;
;
function useRouteCalculator() {
    _s();
    const [state, setState] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        status: "idle",
        route: null,
        error: null
    });
    const calculate = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useRouteCalculator.useCallback[calculate]": async (pickup, dropoff)=>{
            // Guard: ensure Google Maps is available before calling
            if (("TURBOPACK compile-time value", "object") === "undefined" || !window.google?.maps) {
                setState({
                    status: "error",
                    route: null,
                    error: "Google Maps not available"
                });
                return;
            }
            setState({
                status: "loading",
                route: null,
                error: null
            });
            try {
                const route = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$lib$2f$geo$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["calculateRoute"])(pickup, dropoff);
                setState({
                    status: "success",
                    route,
                    error: null
                });
            } catch (err) {
                const message = err instanceof Error ? err.message : "Route calculation failed";
                setState({
                    status: "error",
                    route: null,
                    error: message
                });
            }
        }
    }["useRouteCalculator.useCallback[calculate]"], []);
    const reset = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useRouteCalculator.useCallback[reset]": ()=>{
            setState({
                status: "idle",
                route: null,
                error: null
            });
        }
    }["useRouteCalculator.useCallback[reset]"], []);
    return {
        ...state,
        calculate,
        reset
    };
}
_s(useRouteCalculator, "stvr3FNg7frVg0cFKMbJ8PcjYDw=");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/sottovento/components/booking-section.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "BookingSection",
    ()=>BookingSection
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sottovento/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sottovento/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sottovento/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$hooks$2f$useAttribution$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sottovento/hooks/useAttribution.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$lib$2f$zones$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sottovento/lib/zones.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$lib$2f$pricing$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sottovento/lib/pricing.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$components$2f$places$2d$autocomplete$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sottovento/components/places-autocomplete.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$components$2f$route$2d$info$2d$display$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sottovento/components/route-info-display.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$hooks$2f$useGoogleMapsLoader$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sottovento/hooks/useGoogleMapsLoader.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$hooks$2f$useZoneValidation$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sottovento/hooks/useZoneValidation.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$hooks$2f$useRouteCalculator$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sottovento/hooks/useRouteCalculator.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
;
;
;
;
// ─── Quick Routes ─────────────────────────────────────────────
const QUICK_ROUTES = [
    {
        label: "MCO Airport",
        icon: "✈",
        zone: "MCO"
    },
    {
        label: "Universal / I-Drive",
        icon: "🎡",
        zone: "UNIVERSAL_IDRIVE"
    },
    {
        label: "Disney",
        icon: "🏰",
        zone: "DISNEY"
    },
    {
        label: "Port Canaveral",
        icon: "🚢",
        zone: "PORT_CANAVERAL"
    },
    {
        label: "Downtown / Dr. Phillips",
        icon: "🏙",
        zone: "DOWNTOWN"
    }
];
// ─── Vehicle data ─────────────────────────────────────────────
const VEHICLES = [
    {
        type: "Sedan",
        label: "Mercedes S-Class",
        cap: "Up to 3 passengers",
        note: "Executive Sedan"
    },
    {
        type: "SUV",
        label: "Cadillac Escalade ESV",
        cap: "Up to 6 passengers",
        note: "Luxury SUV"
    }
];
// ─── Accent color ─────────────────────────────────────────────
const GOLD = "#C9A84C";
// ─── Step indicator ───────────────────────────────────────────
const STEP_LABELS = [
    "Route",
    "Vehicle",
    "Date & Time",
    "Your Info",
    "Confirm"
];
function StepBar({ current }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex items-center justify-between mb-8 px-1",
        children: STEP_LABELS.map((label, i)=>{
            const n = i + 1;
            const done = n < current;
            const active = n === current;
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-col items-center gap-1 flex-1",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                        style: {
                            backgroundColor: done ? GOLD : active ? GOLD : "transparent",
                            border: `2px solid ${done || active ? GOLD : "rgba(255,255,255,0.2)"}`,
                            color: done || active ? "#000" : "rgba(255,255,255,0.4)"
                        },
                        children: done ? "✓" : n
                    }, void 0, false, {
                        fileName: "[project]/sottovento/components/booking-section.tsx",
                        lineNumber: 61,
                        columnNumber: 13
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "text-xs tracking-wide hidden sm:block",
                        style: {
                            color: active ? GOLD : done ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.3)"
                        },
                        children: label
                    }, void 0, false, {
                        fileName: "[project]/sottovento/components/booking-section.tsx",
                        lineNumber: 71,
                        columnNumber: 13
                    }, this)
                ]
            }, label, true, {
                fileName: "[project]/sottovento/components/booking-section.tsx",
                lineNumber: 60,
                columnNumber: 11
            }, this);
        })
    }, void 0, false, {
        fileName: "[project]/sottovento/components/booking-section.tsx",
        lineNumber: 54,
        columnNumber: 5
    }, this);
}
_c = StepBar;
// ─── Shared input style ───────────────────────────────────────
const inputClass = "w-full bg-white/5 border border-white/15 rounded-lg px-4 text-white placeholder-white/30 focus:outline-none focus:border-yellow-600/60 transition";
const inputStyle = {
    fontSize: 18,
    height: 54
};
const labelStyle = {
    fontSize: 16,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 6,
    display: "block"
};
// ─── Main component ───────────────────────────────────────────
function BookingInner() {
    _s();
    const searchParams = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSearchParams"])();
    // SLN Attribution
    const attribution = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$hooks$2f$useAttribution$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAttribution"])();
    // Google Maps loader
    const { loaded: mapsLoaded } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$hooks$2f$useGoogleMapsLoader$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useGoogleMapsLoader"])();
    // Zone validation
    const { validateZone } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$hooks$2f$useZoneValidation$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useZoneValidation"])();
    // Route calculator
    const routeCalc = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$hooks$2f$useRouteCalculator$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouteCalculator"])();
    const [step, setStep] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(1);
    const [submitted, setSubmitted] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [paying, setPaying] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [payError, setPayError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [step1Error, setStep1Error] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [countdown, setCountdown] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const countdownRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const [supportOpen, setSupportOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    // Zone adjustment notifications
    const [pickupZoneWarning, setPickupZoneWarning] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [dropoffZoneWarning, setDropoffZoneWarning] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [pickupZoneMatch, setPickupZoneMatch] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [dropoffZoneMatch, setDropoffZoneMatch] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    // Geocoded coordinates (stored for Stripe metadata and route calculation)
    const [pickupCoords, setPickupCoords] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [dropoffCoords, setDropoffCoords] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [pickupPlaceId, setPickupPlaceId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [dropoffPlaceId, setDropoffPlaceId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    // Zone mismatch adjustment notification
    const [zoneAdjustedMsg, setZoneAdjustedMsg] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [formData, setFormData] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        name: "",
        phone: "",
        email: "",
        pickupZone: "",
        dropoffZone: "",
        pickupLocation: "",
        dropoffLocation: "",
        date: "",
        time: "",
        returnDate: "",
        returnTime: "",
        returnPickupLocation: "",
        passengers: "1",
        serviceType: "oneway",
        tripType: "oneway",
        waitTime: "none",
        extraStop: "none",
        vehicleType: "SUV",
        upgradeVehicle: false,
        luggage: "1-2 bags",
        flightNumber: "",
        notes: "",
        hoursRequested: "",
        eventDestination: "",
        returnLocation: ""
    });
    // ── URL params ────────────────────────────────────────────────
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "BookingInner.useEffect": ()=>{
            const pkg = searchParams.get("package");
            const service = searchParams.get("service");
            const updates = {};
            if (pkg) {
                const zoneId = __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$lib$2f$zones$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PACKAGE_TO_ZONE"][pkg.toLowerCase()];
                if (zoneId) updates.pickupZone = zoneId;
            }
            if (service === "hourly") updates.serviceType = "hourly";
            if (Object.keys(updates).length > 0) setFormData({
                "BookingInner.useEffect": (prev)=>({
                        ...prev,
                        ...updates
                    })
            }["BookingInner.useEffect"]);
        }
    }["BookingInner.useEffect"], [
        searchParams
    ]);
    // ── Trigger route calculation when both coords are set ────────
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "BookingInner.useEffect": ()=>{
            if (pickupCoords && dropoffCoords && mapsLoaded) {
                routeCalc.calculate(pickupCoords, dropoffCoords);
            }
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }
    }["BookingInner.useEffect"], [
        pickupCoords,
        dropoffCoords,
        mapsLoaded
    ]);
    // ── Pickup address selected ───────────────────────────────────
    const handlePickupSelect = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "BookingInner.useCallback[handlePickupSelect]": (result)=>{
            const coords = {
                lat: result.lat,
                lng: result.lng
            };
            setPickupCoords(coords);
            setPickupPlaceId(result.placeId);
            const validation = validateZone(formData.pickupZone, result.lat, result.lng, "pickup");
            if (!validation.isMatch && validation.detectedZone) {
                // Auto-correct the zone
                setFormData({
                    "BookingInner.useCallback[handlePickupSelect]": (prev)=>({
                            ...prev,
                            pickupLocation: result.formattedAddress,
                            pickupZone: validation.detectedZone
                        })
                }["BookingInner.useCallback[handlePickupSelect]"]);
                setPickupZoneWarning(validation.warningMessage);
                setZoneAdjustedMsg("Pickup zone updated automatically. Price adjusted.");
                setTimeout({
                    "BookingInner.useCallback[handlePickupSelect]": ()=>setZoneAdjustedMsg(null)
                }["BookingInner.useCallback[handlePickupSelect]"], 5000);
            } else {
                setFormData({
                    "BookingInner.useCallback[handlePickupSelect]": (prev)=>({
                            ...prev,
                            pickupLocation: result.formattedAddress
                        })
                }["BookingInner.useCallback[handlePickupSelect]"]);
                setPickupZoneWarning(null);
            }
            setPickupZoneMatch(validation.isMatch && !!validation.detectedZone);
        }
    }["BookingInner.useCallback[handlePickupSelect]"], [
        formData.pickupZone,
        validateZone
    ]);
    // ── Dropoff address selected ──────────────────────────────────
    const handleDropoffSelect = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "BookingInner.useCallback[handleDropoffSelect]": (result)=>{
            const coords = {
                lat: result.lat,
                lng: result.lng
            };
            setDropoffCoords(coords);
            setDropoffPlaceId(result.placeId);
            const validation = validateZone(formData.dropoffZone, result.lat, result.lng, "dropoff");
            if (!validation.isMatch && validation.detectedZone) {
                // Auto-correct the zone
                setFormData({
                    "BookingInner.useCallback[handleDropoffSelect]": (prev)=>({
                            ...prev,
                            dropoffLocation: result.formattedAddress,
                            dropoffZone: validation.detectedZone
                        })
                }["BookingInner.useCallback[handleDropoffSelect]"]);
                setDropoffZoneWarning(validation.warningMessage);
                setZoneAdjustedMsg("Destination updated. Trip price adjusted accordingly.");
                setTimeout({
                    "BookingInner.useCallback[handleDropoffSelect]": ()=>setZoneAdjustedMsg(null)
                }["BookingInner.useCallback[handleDropoffSelect]"], 5000);
            } else {
                setFormData({
                    "BookingInner.useCallback[handleDropoffSelect]": (prev)=>({
                            ...prev,
                            dropoffLocation: result.formattedAddress
                        })
                }["BookingInner.useCallback[handleDropoffSelect]"]);
                setDropoffZoneWarning(null);
            }
            setDropoffZoneMatch(validation.isMatch && !!validation.detectedZone);
        }
    }["BookingInner.useCallback[handleDropoffSelect]"], [
        formData.dropoffZone,
        validateZone
    ]);
    // ── Clear coords and route when zone changes manually ─────────
    const handlePickupZoneChange = (zone)=>{
        setFormData((prev)=>({
                ...prev,
                pickupZone: zone
            }));
        setPickupZoneWarning(null);
        setPickupZoneMatch(false);
        // Re-validate if we already have coords
        if (pickupCoords) {
            const validation = validateZone(zone, pickupCoords.lat, pickupCoords.lng, "pickup");
            if (!validation.isMatch && validation.detectedZone) {
                setPickupZoneWarning(validation.warningMessage);
            }
            setPickupZoneMatch(validation.isMatch && !!validation.detectedZone);
        }
    };
    const handleDropoffZoneChange = (zone)=>{
        setFormData((prev)=>({
                ...prev,
                dropoffZone: zone
            }));
        setDropoffZoneWarning(null);
        setDropoffZoneMatch(false);
        if (dropoffCoords) {
            const validation = validateZone(zone, dropoffCoords.lat, dropoffCoords.lng, "dropoff");
            if (!validation.isMatch && validation.detectedZone) {
                setDropoffZoneWarning(validation.warningMessage);
            }
            setDropoffZoneMatch(validation.isMatch && !!validation.detectedZone);
        }
    };
    // ── Derived values ────────────────────────────────────────────
    const isHourly = formData.serviceType === "hourly";
    const isRoundTrip = formData.tripType === "roundtrip" && !isHourly;
    const isLongDistance = [
        "KENNEDY",
        "TAMPA",
        "CLEARWATER",
        "MIAMI"
    ].includes(formData.dropoffZone) || [
        "KENNEDY",
        "TAMPA",
        "CLEARWATER",
        "MIAMI"
    ].includes(formData.pickupZone);
    const showUpgrade = formData.vehicleType === "Sedan" && !isHourly;
    const hourlyPrice = (()=>{
        if (!isHourly) return null;
        const pkg = __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$lib$2f$pricing$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["HOURLY_PACKAGES"].find((p)=>p.hours === Number(formData.hoursRequested));
        if (pkg) return pkg.price;
        const hrs = Number(formData.hoursRequested);
        if (hrs >= 3) return hrs * __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$lib$2f$pricing$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["HOURLY_RATE"];
        return null;
    })();
    const priceResolution = !isHourly && formData.pickupZone && formData.dropoffZone && formData.vehicleType ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$lib$2f$pricing$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getPriceResolutionWithAddons"])({
        pickupZone: formData.pickupZone,
        dropoffZone: formData.dropoffZone,
        vehicle: formData.vehicleType,
        serviceType: formData.tripType,
        waitTime: formData.waitTime,
        extraStop: formData.extraStop,
        upgrade: formData.upgradeVehicle
    }) : null;
    const transferPrice = priceResolution?.finalPrice ?? null;
    const isOutOfArea = priceResolution?.resolution?.type === "out_of_area";
    const priceResolutionType = priceResolution?.resolution?.type ?? null;
    const price = isHourly ? hourlyPrice : transferPrice;
    const canPay = !isHourly && price !== null && !isOutOfArea;
    const effectiveVehicle = formData.upgradeVehicle && formData.vehicleType === "Sedan" ? "SUV" : formData.vehicleType;
    const priceBreakdown = (()=>{
        if (isHourly || !transferPrice) return null;
        const lines = [];
        if (formData.waitTime !== "none") lines.push(`Waiting time: +$${__TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$lib$2f$pricing$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["WAIT_ADDONS"][formData.waitTime]}`);
        if (formData.extraStop !== "none") lines.push(`Extra stop: +$${__TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$lib$2f$pricing$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["EXTRA_STOP_ADDONS"][formData.extraStop]}`);
        if (formData.upgradeVehicle && formData.vehicleType === "Sedan") lines.push(`Vehicle upgrade: +$${__TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$lib$2f$pricing$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["UPGRADE_ADDON"]}`);
        return lines;
    })();
    // ── Request text for send buttons ─────────────────────────────
    const coordsText = pickupCoords && dropoffCoords ? `\nPickup Coords: ${pickupCoords.lat.toFixed(6)},${pickupCoords.lng.toFixed(6)}\nDropoff Coords: ${dropoffCoords.lat.toFixed(6)},${dropoffCoords.lng.toFixed(6)}` : "";
    const routeText = routeCalc.route ? `\nRoute Distance: ${routeCalc.route.distanceMiles} mi (${routeCalc.route.durationText})` : "";
    const requestText = isHourly ? `SOTTOVENTO BOOKING REQUEST — HOURLY CHAUFFEUR\nName: ${formData.name}\nPhone: ${formData.phone}\nEmail: ${formData.email}\nVehicle: ${effectiveVehicle}\nPassengers: ${formData.passengers}\nLuggage: ${formData.luggage}\nDate/Time: ${formData.date} ${formData.time}\nPickup Location: ${formData.pickupLocation}\nEvent / Destination: ${formData.eventDestination}\nHours Requested: ${formData.hoursRequested}\nReturn Location: ${formData.returnLocation || "N/A"}\nEstimated Price: ${price ? `$${price}` : "To be confirmed"}\nFlight #: ${formData.flightNumber || "N/A"}\nNotes: ${formData.notes || "N/A"}${coordsText}` : `SOTTOVENTO BOOKING REQUEST — ${formData.tripType === "roundtrip" ? "ROUND TRIP" : "ONE WAY"}\nName: ${formData.name}\nPhone: ${formData.phone}\nEmail: ${formData.email}\nPickup Zone: ${formData.pickupZone}\nDrop-off Zone: ${formData.dropoffZone}\nVehicle: ${effectiveVehicle}${formData.upgradeVehicle && formData.vehicleType === "Sedan" ? " (Upgraded from Sedan)" : ""}\nPassengers: ${formData.passengers}\nLuggage: ${formData.luggage}\nDate/Time: ${formData.date} ${formData.time}\nPickup: ${formData.pickupLocation}\nDrop-off: ${formData.dropoffLocation}${isRoundTrip ? `\nReturn Date/Time: ${formData.returnDate} ${formData.returnTime}\nReturn Pickup: ${formData.returnPickupLocation || "Same as drop-off"}` : ""}${formData.waitTime !== "none" ? `\nWaiting Time: ${formData.waitTime} (+$${__TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$lib$2f$pricing$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["WAIT_ADDONS"][formData.waitTime]})` : ""}${formData.extraStop !== "none" ? `\nExtra Stop: ${__TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$lib$2f$pricing$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["EXTRA_STOP_LABELS"][formData.extraStop]}` : ""}\nFlight #: ${formData.flightNumber || "N/A"}\nNotes: ${formData.notes || "N/A"}\nGuaranteed Price: $${price ?? "N/A"}${coordsText}${routeText}`;
    const encoded = encodeURIComponent(requestText);
    // ── Auto-return countdown (tablet mode) ───────────────────────
    const startCountdown = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "BookingInner.useCallback[startCountdown]": ()=>{
            const fromTablet = searchParams.get("tablet") || searchParams.get("ref");
            if (!fromTablet) return;
            setCountdown(30);
            countdownRef.current = setInterval({
                "BookingInner.useCallback[startCountdown]": ()=>{
                    setCountdown({
                        "BookingInner.useCallback[startCountdown]": (c)=>{
                            if (c === null || c <= 1) {
                                clearInterval(countdownRef.current);
                                window.location.href = "/tablet";
                                return null;
                            }
                            return c - 1;
                        }
                    }["BookingInner.useCallback[startCountdown]"]);
                }
            }["BookingInner.useCallback[startCountdown]"], 1000);
        }
    }["BookingInner.useCallback[startCountdown]"], [
        searchParams
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "BookingInner.useEffect": ()=>{
            if (submitted) startCountdown();
            return ({
                "BookingInner.useEffect": ()=>{
                    if (countdownRef.current) clearInterval(countdownRef.current);
                }
            })["BookingInner.useEffect"];
        }
    }["BookingInner.useEffect"], [
        submitted,
        startCountdown
    ]);
    // ── Payment ───────────────────────────────────────────────────
    const handlePayment = async ()=>{
        setPayError("");
        if (isHourly) {
            setPayError("For hourly service, please send your request via Email, SMS or WhatsApp below.");
            return;
        }
        if (!formData.pickupZone || !formData.dropoffZone) {
            setPayError("Please select a pickup zone and drop-off zone.");
            return;
        }
        if (!formData.pickupLocation?.trim()) {
            setPayError("Pickup address is required before proceeding to payment.");
            return;
        }
        if (!formData.dropoffLocation?.trim()) {
            setPayError("Drop-off address is required before proceeding to payment.");
            return;
        }
        if (!formData.date || !formData.time) {
            setPayError("Pickup date and time are required.");
            return;
        }
        if (!formData.name || !formData.phone || !formData.email) {
            setPayError("Please complete your contact information.");
            return;
        }
        setPaying(true);
        try {
            // Build Stripe metadata with full coordinate, zone, and attribution data
            const attrMeta = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$hooks$2f$useAttribution$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["buildAttributionMetadata"])(attribution);
            const metadata = {
                pickup_address: formData.pickupLocation,
                dropoff_address: formData.dropoffLocation,
                pickup_zone_selected: formData.pickupZone,
                dropoff_zone_selected: formData.dropoffZone,
                vehicle: effectiveVehicle,
                passengers: formData.passengers,
                luggage: formData.luggage,
                date: formData.date,
                time: formData.time,
                flight_number: formData.flightNumber || "",
                notes: formData.notes || "",
                trip_type: formData.tripType,
                // SLN Attribution (Step 10 — full rollout)
                ...attrMeta,
                // Legacy fallback params (backward compat)
                ref: attribution.ref || searchParams.get("ref") || "",
                driver: attribution.driver || searchParams.get("driver") || "",
                tablet: attribution.tablet || searchParams.get("tablet") || "",
                package: attribution.package || searchParams.get("package") || "",
                service: attribution.service || searchParams.get("service") || ""
            };
            // Add coordinates if available
            if (pickupCoords) {
                metadata.pickup_lat = pickupCoords.lat.toFixed(6);
                metadata.pickup_lng = pickupCoords.lng.toFixed(6);
            }
            if (dropoffCoords) {
                metadata.dropoff_lat = dropoffCoords.lat.toFixed(6);
                metadata.dropoff_lng = dropoffCoords.lng.toFixed(6);
            }
            if (routeCalc.route) {
                metadata.route_distance_miles = String(routeCalc.route.distanceMiles);
                metadata.route_duration_text = routeCalc.route.durationText;
            }
            const res = await fetch("/api/checkout", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    amount: price,
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    metadata
                })
            });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                setPayError(data.error || "Payment failed. Please try again.");
                setPaying(false);
            }
        } catch  {
            setPayError("Payment failed. Please try again or use Email/WhatsApp.");
            setPaying(false);
        }
    };
    // ─────────────────────────────────────────────────────────────
    // SUCCESS SCREEN
    // ─────────────────────────────────────────────────────────────
    if (submitted) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
            className: "min-h-dvh flex items-center justify-center bg-black px-4 py-16",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "max-w-md w-full text-center space-y-8",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "text-6xl",
                        style: {
                            color: GOLD
                        },
                        children: "✔"
                    }, void 0, false, {
                        fileName: "[project]/sottovento/components/booking-section.tsx",
                        lineNumber: 459,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        className: "text-white font-light",
                        style: {
                            fontSize: 32,
                            fontFamily: "serif"
                        },
                        children: "Request Sent"
                    }, void 0, false, {
                        fileName: "[project]/sottovento/components/booking-section.tsx",
                        lineNumber: 460,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-white/50",
                        style: {
                            fontSize: 18
                        },
                        children: "Your driver will contact you shortly to confirm the details."
                    }, void 0, false, {
                        fileName: "[project]/sottovento/components/booking-section.tsx",
                        lineNumber: 463,
                        columnNumber: 11
                    }, this),
                    countdown !== null && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-white/30 text-sm",
                        children: [
                            "Returning to carousel in ",
                            countdown,
                            " seconds..."
                        ]
                    }, void 0, true, {
                        fileName: "[project]/sottovento/components/booking-section.tsx",
                        lineNumber: 467,
                        columnNumber: 13
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-col gap-3 mt-6",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>{
                                    setSubmitted(false);
                                    setStep(1);
                                    setPickupCoords(null);
                                    setDropoffCoords(null);
                                    setPickupPlaceId("");
                                    setDropoffPlaceId("");
                                    setPickupZoneWarning(null);
                                    setDropoffZoneWarning(null);
                                    setPickupZoneMatch(false);
                                    setDropoffZoneMatch(false);
                                    routeCalc.reset();
                                    setFormData((prev)=>({
                                            ...prev,
                                            name: "",
                                            phone: "",
                                            email: "",
                                            pickupLocation: "",
                                            dropoffLocation: "",
                                            date: "",
                                            time: "",
                                            notes: ""
                                        }));
                                },
                                className: "w-full py-4 rounded-lg border text-white font-medium tracking-widest uppercase text-sm transition hover:border-yellow-600/60",
                                style: {
                                    borderColor: "rgba(255,255,255,0.15)",
                                    fontSize: 16
                                },
                                children: "New Quote"
                            }, void 0, false, {
                                fileName: "[project]/sottovento/components/booking-section.tsx",
                                lineNumber: 472,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                href: "/tablet",
                                className: "w-full py-4 rounded-lg text-center font-medium tracking-widest uppercase text-sm transition",
                                style: {
                                    backgroundColor: GOLD,
                                    color: "#000",
                                    fontSize: 16,
                                    display: "block"
                                },
                                children: "Back to Carousel"
                            }, void 0, false, {
                                fileName: "[project]/sottovento/components/booking-section.tsx",
                                lineNumber: 502,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/sottovento/components/booking-section.tsx",
                        lineNumber: 471,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/sottovento/components/booking-section.tsx",
                lineNumber: 458,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/sottovento/components/booking-section.tsx",
            lineNumber: 457,
            columnNumber: 7
        }, this);
    }
    // ─────────────────────────────────────────────────────────────
    // BOOKING FLOW
    // ─────────────────────────────────────────────────────────────
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        id: "booking",
        className: "py-16 md:py-24 bg-black",
        style: {
            minHeight: "100dvh",
            overflowY: "auto",
            WebkitOverflowScrolling: "touch"
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "container mx-auto px-4",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "max-w-2xl mx-auto",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "text-center mb-10",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                    className: "font-light tracking-wider text-white",
                                    style: {
                                        fontSize: "clamp(26px, 5vw, 32px)",
                                        fontFamily: "serif"
                                    },
                                    children: "Reserve Your Luxury Ride"
                                }, void 0, false, {
                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                    lineNumber: 529,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-white/40 mt-2",
                                    style: {
                                        fontSize: 16
                                    },
                                    children: "Guaranteed price. No surprises."
                                }, void 0, false, {
                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                    lineNumber: 535,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/sottovento/components/booking-section.tsx",
                            lineNumber: 528,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(StepBar, {
                            current: step
                        }, void 0, false, {
                            fileName: "[project]/sottovento/components/booking-section.tsx",
                            lineNumber: 541,
                            columnNumber: 11
                        }, this),
                        zoneAdjustedMsg && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "mb-4 rounded-xl px-4 py-3 text-sm flex items-center gap-2",
                            style: {
                                backgroundColor: `${GOLD}12`,
                                border: `1px solid ${GOLD}40`,
                                color: GOLD
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: "✓"
                                }, void 0, false, {
                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                    lineNumber: 553,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: zoneAdjustedMsg
                                }, void 0, false, {
                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                    lineNumber: 554,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/sottovento/components/booking-section.tsx",
                            lineNumber: 545,
                            columnNumber: 13
                        }, this),
                        step === 1 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "space-y-6",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                    className: "text-white font-light",
                                    style: {
                                        fontSize: 24,
                                        fontFamily: "serif"
                                    },
                                    children: "Where are you going?"
                                }, void 0, false, {
                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                    lineNumber: 561,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            style: labelStyle,
                                            children: "Type of Service"
                                        }, void 0, false, {
                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                            lineNumber: 567,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "grid grid-cols-2 gap-3",
                                            children: [
                                                {
                                                    value: "oneway",
                                                    label: "One Way"
                                                },
                                                {
                                                    value: "roundtrip",
                                                    label: "Round Trip"
                                                },
                                                {
                                                    value: "hourly",
                                                    label: "Hourly Chauffeur"
                                                },
                                                {
                                                    value: "corporate",
                                                    label: "Corporate"
                                                }
                                            ].map((opt)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    type: "button",
                                                    onClick: ()=>setFormData({
                                                            ...formData,
                                                            serviceType: opt.value,
                                                            tripType: opt.value === "roundtrip" ? "roundtrip" : "oneway"
                                                        }),
                                                    className: "py-4 rounded-lg border font-medium transition text-center",
                                                    style: {
                                                        fontSize: 16,
                                                        borderColor: formData.serviceType === opt.value ? GOLD : "rgba(255,255,255,0.15)",
                                                        color: formData.serviceType === opt.value ? GOLD : "rgba(255,255,255,0.6)",
                                                        backgroundColor: formData.serviceType === opt.value ? `${GOLD}15` : "transparent"
                                                    },
                                                    children: opt.label
                                                }, opt.value, false, {
                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                    lineNumber: 575,
                                                    columnNumber: 21
                                                }, this))
                                        }, void 0, false, {
                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                            lineNumber: 568,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                    lineNumber: 566,
                                    columnNumber: 15
                                }, this),
                                !isHourly && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            style: labelStyle,
                                            children: "Quick Select — Pickup Zone"
                                        }, void 0, false, {
                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                            lineNumber: 596,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "grid grid-cols-2 sm:grid-cols-3 gap-3",
                                            children: QUICK_ROUTES.map((r)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    type: "button",
                                                    onClick: ()=>handlePickupZoneChange(r.zone),
                                                    className: "py-4 px-3 rounded-lg border flex flex-col items-center gap-1 transition",
                                                    style: {
                                                        borderColor: formData.pickupZone === r.zone ? GOLD : "rgba(255,255,255,0.12)",
                                                        backgroundColor: formData.pickupZone === r.zone ? `${GOLD}15` : "rgba(255,255,255,0.03)",
                                                        color: formData.pickupZone === r.zone ? GOLD : "rgba(255,255,255,0.6)"
                                                    },
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            style: {
                                                                fontSize: 24
                                                            },
                                                            children: r.icon
                                                        }, void 0, false, {
                                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                                            lineNumber: 610,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            style: {
                                                                fontSize: 13
                                                            },
                                                            children: r.label
                                                        }, void 0, false, {
                                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                                            lineNumber: 611,
                                                            columnNumber: 25
                                                        }, this)
                                                    ]
                                                }, r.zone, true, {
                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                    lineNumber: 599,
                                                    columnNumber: 23
                                                }, this))
                                        }, void 0, false, {
                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                            lineNumber: 597,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                    lineNumber: 595,
                                    columnNumber: 17
                                }, this),
                                !isHourly && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "grid grid-cols-1 sm:grid-cols-2 gap-4",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    style: labelStyle,
                                                    children: "Pickup Zone *"
                                                }, void 0, false, {
                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                    lineNumber: 622,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                    value: formData.pickupZone,
                                                    onChange: (e)=>handlePickupZoneChange(e.target.value),
                                                    className: inputClass,
                                                    style: {
                                                        ...inputStyle,
                                                        paddingTop: 0,
                                                        paddingBottom: 0
                                                    },
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                            value: "",
                                                            children: "Select zone..."
                                                        }, void 0, false, {
                                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                                            lineNumber: 629,
                                                            columnNumber: 23
                                                        }, this),
                                                        __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$lib$2f$zones$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ZONES"].map((z)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                value: z.id,
                                                                children: z.label
                                                            }, z.id, false, {
                                                                fileName: "[project]/sottovento/components/booking-section.tsx",
                                                                lineNumber: 630,
                                                                columnNumber: 41
                                                            }, this))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                    lineNumber: 623,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                            lineNumber: 621,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    style: labelStyle,
                                                    children: "Drop-off Zone *"
                                                }, void 0, false, {
                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                    lineNumber: 634,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                    value: formData.dropoffZone,
                                                    onChange: (e)=>handleDropoffZoneChange(e.target.value),
                                                    className: inputClass,
                                                    style: {
                                                        ...inputStyle,
                                                        paddingTop: 0,
                                                        paddingBottom: 0
                                                    },
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                            value: "",
                                                            children: "Select zone..."
                                                        }, void 0, false, {
                                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                                            lineNumber: 641,
                                                            columnNumber: 23
                                                        }, this),
                                                        __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$lib$2f$zones$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ZONES"].map((z)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                value: z.id,
                                                                children: z.label
                                                            }, z.id, false, {
                                                                fileName: "[project]/sottovento/components/booking-section.tsx",
                                                                lineNumber: 642,
                                                                columnNumber: 41
                                                            }, this))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                    lineNumber: 635,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                            lineNumber: 633,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "sm:col-span-2",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$components$2f$places$2d$autocomplete$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PlacesAutocomplete"], {
                                                id: "pickup-address",
                                                label: "Pickup Address *",
                                                value: formData.pickupLocation,
                                                placeholder: "Hotel, terminal, address...",
                                                mapsLoaded: mapsLoaded,
                                                onSelect: handlePickupSelect,
                                                onChange: (val)=>setFormData((prev)=>({
                                                            ...prev,
                                                            pickupLocation: val
                                                        })),
                                                zoneWarning: pickupZoneWarning,
                                                zoneMatch: pickupZoneMatch
                                            }, void 0, false, {
                                                fileName: "[project]/sottovento/components/booking-section.tsx",
                                                lineNumber: 648,
                                                columnNumber: 21
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                            lineNumber: 647,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "sm:col-span-2",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$components$2f$places$2d$autocomplete$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PlacesAutocomplete"], {
                                                id: "dropoff-address",
                                                label: "Drop-off Address *",
                                                value: formData.dropoffLocation,
                                                placeholder: "Hotel, terminal, address...",
                                                mapsLoaded: mapsLoaded,
                                                onSelect: handleDropoffSelect,
                                                onChange: (val)=>setFormData((prev)=>({
                                                            ...prev,
                                                            dropoffLocation: val
                                                        })),
                                                zoneWarning: dropoffZoneWarning,
                                                zoneMatch: dropoffZoneMatch
                                            }, void 0, false, {
                                                fileName: "[project]/sottovento/components/booking-section.tsx",
                                                lineNumber: 663,
                                                columnNumber: 21
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                            lineNumber: 662,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                    lineNumber: 620,
                                    columnNumber: 17
                                }, this),
                                !isHourly && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$components$2f$route$2d$info$2d$display$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["RouteInfoDisplay"], {
                                    status: routeCalc.status,
                                    route: routeCalc.route,
                                    error: routeCalc.error
                                }, void 0, false, {
                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                    lineNumber: 680,
                                    columnNumber: 17
                                }, this),
                                isHourly && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "space-y-4",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$components$2f$places$2d$autocomplete$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PlacesAutocomplete"], {
                                            id: "hourly-pickup",
                                            label: "Pickup Location *",
                                            value: formData.pickupLocation,
                                            placeholder: "Hotel name, address...",
                                            mapsLoaded: mapsLoaded,
                                            onSelect: (result)=>{
                                                setFormData((prev)=>({
                                                        ...prev,
                                                        pickupLocation: result.formattedAddress
                                                    }));
                                                setPickupCoords({
                                                    lat: result.lat,
                                                    lng: result.lng
                                                });
                                            },
                                            onChange: (val)=>setFormData((prev)=>({
                                                        ...prev,
                                                        pickupLocation: val
                                                    }))
                                        }, void 0, false, {
                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                            lineNumber: 690,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    style: labelStyle,
                                                    children: "Event / Main Destination *"
                                                }, void 0, false, {
                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                    lineNumber: 703,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    type: "text",
                                                    value: formData.eventDestination,
                                                    onChange: (e)=>setFormData({
                                                            ...formData,
                                                            eventDestination: e.target.value
                                                        }),
                                                    placeholder: "Event venue, destination...",
                                                    className: inputClass,
                                                    style: inputStyle
                                                }, void 0, false, {
                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                    lineNumber: 704,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                            lineNumber: 702,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    style: labelStyle,
                                                    children: "Number of Hours * (min. 3)"
                                                }, void 0, false, {
                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                    lineNumber: 714,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    type: "number",
                                                    min: "3",
                                                    value: formData.hoursRequested,
                                                    onChange: (e)=>setFormData({
                                                            ...formData,
                                                            hoursRequested: e.target.value
                                                        }),
                                                    placeholder: "3",
                                                    className: inputClass,
                                                    style: inputStyle
                                                }, void 0, false, {
                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                    lineNumber: 715,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                            lineNumber: 713,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                    lineNumber: 689,
                                    columnNumber: 17
                                }, this),
                                !isHourly && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "grid grid-cols-1 sm:grid-cols-2 gap-4",
                                    children: [
                                        isLongDistance && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    style: labelStyle,
                                                    children: "Waiting Package"
                                                }, void 0, false, {
                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                    lineNumber: 733,
                                                    columnNumber: 23
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                    value: formData.waitTime,
                                                    onChange: (e)=>setFormData({
                                                            ...formData,
                                                            waitTime: e.target.value
                                                        }),
                                                    className: inputClass,
                                                    style: {
                                                        ...inputStyle,
                                                        paddingTop: 0,
                                                        paddingBottom: 0
                                                    },
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                            value: "none",
                                                            children: "No Wait"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                                            lineNumber: 735,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                            value: "2h",
                                                            children: "2 Hours (+$80)"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                                            lineNumber: 736,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                            value: "4h",
                                                            children: "4 Hours (+$150)"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                                            lineNumber: 737,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                            value: "fullday",
                                                            children: "Full Day (+$350)"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                                            lineNumber: 738,
                                                            columnNumber: 25
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                    lineNumber: 734,
                                                    columnNumber: 23
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                            lineNumber: 732,
                                            columnNumber: 21
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    style: labelStyle,
                                                    children: "Extra Stop"
                                                }, void 0, false, {
                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                    lineNumber: 743,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                    value: formData.extraStop,
                                                    onChange: (e)=>setFormData({
                                                            ...formData,
                                                            extraStop: e.target.value
                                                        }),
                                                    className: inputClass,
                                                    style: {
                                                        ...inputStyle,
                                                        paddingTop: 0,
                                                        paddingBottom: 0
                                                    },
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                            value: "none",
                                                            children: "No extra stop"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                                            lineNumber: 745,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                            value: "quick",
                                                            children: "Quick (10 min) +$15"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                                            lineNumber: 746,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                            value: "short",
                                                            children: "Short (20 min) +$25"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                                            lineNumber: 747,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                            value: "extended",
                                                            children: "Extended (40 min) +$40"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                                            lineNumber: 748,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                    lineNumber: 744,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                            lineNumber: 742,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                    lineNumber: 730,
                                    columnNumber: 17
                                }, this),
                                step1Error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "rounded-xl px-4 py-3 text-sm",
                                    style: {
                                        backgroundColor: "#7c2d1220",
                                        color: "#fca5a5",
                                        border: "1px solid #dc262640"
                                    },
                                    children: step1Error
                                }, void 0, false, {
                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                    lineNumber: 756,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: ()=>{
                                        if (!isHourly) {
                                            if (!formData.pickupZone || !formData.dropoffZone) {
                                                setStep1Error("Please select a pickup zone and drop-off zone.");
                                                return;
                                            }
                                            if (!formData.pickupLocation?.trim()) {
                                                setStep1Error("Please enter a pickup address.");
                                                return;
                                            }
                                            if (!formData.dropoffLocation?.trim()) {
                                                setStep1Error("Please enter a drop-off address.");
                                                return;
                                            }
                                        } else {
                                            if (!formData.pickupLocation?.trim()) {
                                                setStep1Error("Please enter a pickup location.");
                                                return;
                                            }
                                        }
                                        setStep1Error("");
                                        setStep(2);
                                    },
                                    className: "w-full py-4 rounded-lg font-medium tracking-widest uppercase transition",
                                    style: {
                                        backgroundColor: GOLD,
                                        color: "#000",
                                        fontSize: 18
                                    },
                                    children: "Continue →"
                                }, void 0, false, {
                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                    lineNumber: 760,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/sottovento/components/booking-section.tsx",
                            lineNumber: 560,
                            columnNumber: 13
                        }, this),
                        step === 2 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "space-y-6",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                    className: "text-white font-light",
                                    style: {
                                        fontSize: 24,
                                        fontFamily: "serif"
                                    },
                                    children: "Choose your vehicle"
                                }, void 0, false, {
                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                    lineNumber: 796,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "space-y-4",
                                    children: [
                                        VEHICLES.map((v)=>{
                                            const vPriceRes = !isHourly && formData.pickupZone && formData.dropoffZone ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$lib$2f$pricing$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getPriceResolutionWithAddons"])({
                                                pickupZone: formData.pickupZone,
                                                dropoffZone: formData.dropoffZone,
                                                vehicle: v.type,
                                                serviceType: formData.tripType,
                                                waitTime: formData.waitTime,
                                                extraStop: formData.extraStop,
                                                upgrade: false
                                            }) : null;
                                            const vPrice = vPriceRes?.finalPrice ?? null;
                                            const selected = formData.vehicleType === v.type;
                                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                type: "button",
                                                onClick: ()=>setFormData({
                                                        ...formData,
                                                        vehicleType: v.type,
                                                        upgradeVehicle: false
                                                    }),
                                                className: "w-full rounded-xl border p-5 text-left transition",
                                                style: {
                                                    borderColor: selected ? GOLD : "rgba(255,255,255,0.12)",
                                                    backgroundColor: selected ? `${GOLD}12` : "rgba(255,255,255,0.03)"
                                                },
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex justify-between items-start",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                    className: "text-white font-medium",
                                                                    style: {
                                                                        fontSize: 20
                                                                    },
                                                                    children: v.label
                                                                }, void 0, false, {
                                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                                    lineNumber: 819,
                                                                    columnNumber: 27
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                    style: {
                                                                        color: GOLD,
                                                                        fontSize: 14
                                                                    },
                                                                    children: v.note
                                                                }, void 0, false, {
                                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                                    lineNumber: 820,
                                                                    columnNumber: 27
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                    className: "text-white/50 mt-1",
                                                                    style: {
                                                                        fontSize: 15
                                                                    },
                                                                    children: [
                                                                        "👥 ",
                                                                        v.cap
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                                    lineNumber: 821,
                                                                    columnNumber: 27
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                                            lineNumber: 818,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "text-right",
                                                            children: [
                                                                vPrice !== null ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                    className: "text-white font-light",
                                                                    style: {
                                                                        fontSize: 26
                                                                    },
                                                                    children: [
                                                                        "$",
                                                                        vPrice
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                                    lineNumber: 825,
                                                                    columnNumber: 29
                                                                }, this) : formData.pickupZone && formData.dropoffZone && !isHourly ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                    style: {
                                                                        color: GOLD,
                                                                        fontSize: 14
                                                                    },
                                                                    children: "Request Quote"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                                    lineNumber: 827,
                                                                    columnNumber: 29
                                                                }, this) : null,
                                                                selected && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "mt-2 w-6 h-6 rounded-full flex items-center justify-center ml-auto",
                                                                    style: {
                                                                        backgroundColor: GOLD
                                                                    },
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        style: {
                                                                            color: "#000",
                                                                            fontSize: 14
                                                                        },
                                                                        children: "✓"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/sottovento/components/booking-section.tsx",
                                                                        lineNumber: 831,
                                                                        columnNumber: 31
                                                                    }, this)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                                    lineNumber: 830,
                                                                    columnNumber: 29
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                                            lineNumber: 823,
                                                            columnNumber: 25
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                    lineNumber: 817,
                                                    columnNumber: 23
                                                }, this)
                                            }, v.type, false, {
                                                fileName: "[project]/sottovento/components/booking-section.tsx",
                                                lineNumber: 807,
                                                columnNumber: 21
                                            }, this);
                                        }),
                                        showUpgrade && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "button",
                                            onClick: ()=>setFormData({
                                                    ...formData,
                                                    upgradeVehicle: !formData.upgradeVehicle
                                                }),
                                            className: "w-full rounded-xl border p-4 text-left transition",
                                            style: {
                                                borderColor: formData.upgradeVehicle ? GOLD : "rgba(255,255,255,0.12)",
                                                backgroundColor: formData.upgradeVehicle ? `${GOLD}12` : "transparent",
                                                color: formData.upgradeVehicle ? GOLD : "rgba(255,255,255,0.5)",
                                                fontSize: 16
                                            },
                                            children: formData.upgradeVehicle ? "✓ Upgraded to Luxury SUV (+$35)" : "⬆ Upgrade to Luxury SUV (+$35)"
                                        }, void 0, false, {
                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                            lineNumber: 842,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "grid grid-cols-2 gap-4",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            style: labelStyle,
                                                            children: "Passengers"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                                            lineNumber: 860,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                            value: formData.passengers,
                                                            onChange: (e)=>setFormData({
                                                                    ...formData,
                                                                    passengers: e.target.value
                                                                }),
                                                            className: inputClass,
                                                            style: {
                                                                ...inputStyle,
                                                                paddingTop: 0,
                                                                paddingBottom: 0
                                                            },
                                                            children: [
                                                                "1",
                                                                "2",
                                                                "3",
                                                                "4",
                                                                "5",
                                                                "6"
                                                            ].map((n)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                    value: n,
                                                                    children: [
                                                                        n,
                                                                        " ",
                                                                        n === "6" ? "+" : "",
                                                                        " passenger",
                                                                        n !== "1" ? "s" : ""
                                                                    ]
                                                                }, n, true, {
                                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                                    lineNumber: 862,
                                                                    columnNumber: 61
                                                                }, this))
                                                        }, void 0, false, {
                                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                                            lineNumber: 861,
                                                            columnNumber: 21
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                    lineNumber: 859,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            style: labelStyle,
                                                            children: "Luggage"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                                            lineNumber: 866,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                            value: formData.luggage,
                                                            onChange: (e)=>setFormData({
                                                                    ...formData,
                                                                    luggage: e.target.value
                                                                }),
                                                            className: inputClass,
                                                            style: {
                                                                ...inputStyle,
                                                                paddingTop: 0,
                                                                paddingBottom: 0
                                                            },
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                    value: "No luggage",
                                                                    children: "No luggage"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                                    lineNumber: 868,
                                                                    columnNumber: 23
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                    value: "1-2 bags",
                                                                    children: "1–2 bags"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                                    lineNumber: 869,
                                                                    columnNumber: 23
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                    value: "3-4 bags",
                                                                    children: "3–4 bags"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                                    lineNumber: 870,
                                                                    columnNumber: 23
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                    value: "5+ bags",
                                                                    children: "5+ bags"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                                    lineNumber: 871,
                                                                    columnNumber: 23
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                    value: "Oversized / stroller / wheelchair",
                                                                    children: "Oversized / stroller"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                                    lineNumber: 872,
                                                                    columnNumber: 23
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                                            lineNumber: 867,
                                                            columnNumber: 21
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                    lineNumber: 865,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                            lineNumber: 858,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                    lineNumber: 799,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex gap-3",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "button",
                                            onClick: ()=>setStep(1),
                                            className: "flex-1 py-4 rounded-lg border text-white/60 font-medium transition hover:border-white/30",
                                            style: {
                                                borderColor: "rgba(255,255,255,0.15)",
                                                fontSize: 16
                                            },
                                            children: "← Back"
                                        }, void 0, false, {
                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                            lineNumber: 879,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "button",
                                            onClick: ()=>setStep(3),
                                            className: "flex-[2] py-4 rounded-lg font-medium tracking-widest uppercase transition",
                                            style: {
                                                backgroundColor: GOLD,
                                                color: "#000",
                                                fontSize: 18
                                            },
                                            children: "Continue →"
                                        }, void 0, false, {
                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                            lineNumber: 880,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                    lineNumber: 878,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/sottovento/components/booking-section.tsx",
                            lineNumber: 795,
                            columnNumber: 13
                        }, this),
                        step === 3 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "space-y-6",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                    className: "text-white font-light",
                                    style: {
                                        fontSize: 24,
                                        fontFamily: "serif"
                                    },
                                    children: "When is your ride?"
                                }, void 0, false, {
                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                    lineNumber: 888,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "grid grid-cols-1 sm:grid-cols-2 gap-4",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    style: labelStyle,
                                                    children: "📅 Date *"
                                                }, void 0, false, {
                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                    lineNumber: 894,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    type: "date",
                                                    value: formData.date,
                                                    min: new Date().toISOString().split("T")[0],
                                                    onChange: (e)=>setFormData({
                                                            ...formData,
                                                            date: e.target.value
                                                        }),
                                                    className: inputClass,
                                                    style: inputStyle
                                                }, void 0, false, {
                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                    lineNumber: 895,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                            lineNumber: 893,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    style: labelStyle,
                                                    children: "🕐 Pickup Time *"
                                                }, void 0, false, {
                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                    lineNumber: 905,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    type: "time",
                                                    value: formData.time,
                                                    onChange: (e)=>setFormData({
                                                            ...formData,
                                                            time: e.target.value
                                                        }),
                                                    className: inputClass,
                                                    style: inputStyle
                                                }, void 0, false, {
                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                    lineNumber: 906,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                            lineNumber: 904,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                    lineNumber: 892,
                                    columnNumber: 15
                                }, this),
                                formData.date && formData.time && (()=>{
                                    const pickupDT = new Date(`${formData.date}T${formData.time}:00`);
                                    const minDT = new Date(Date.now() + 120 * 60 * 1000);
                                    return pickupDT < minDT ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "rounded-lg p-4",
                                        style: {
                                            backgroundColor: "rgba(239,68,68,0.12)",
                                            border: "1px solid rgba(239,68,68,0.4)"
                                        },
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            style: {
                                                color: "#fca5a5",
                                                fontSize: 14,
                                                lineHeight: 1.5
                                            },
                                            children: [
                                                "⚠️ ",
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                    children: "Advance notice required."
                                                }, void 0, false, {
                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                    lineNumber: 923,
                                                    columnNumber: 26
                                                }, this),
                                                " Sottovento bookings require at least 2 hours advance notice. Please select a later time or",
                                                " ",
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                    href: "#contact",
                                                    style: {
                                                        color: "#fca5a5",
                                                        textDecoration: "underline"
                                                    },
                                                    children: "contact us directly"
                                                }, void 0, false, {
                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                    lineNumber: 924,
                                                    columnNumber: 23
                                                }, this),
                                                " for urgent requests."
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                            lineNumber: 922,
                                            columnNumber: 21
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/sottovento/components/booking-section.tsx",
                                        lineNumber: 921,
                                        columnNumber: 19
                                    }, this) : null;
                                })(),
                                formData.date && formData.time && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "rounded-xl p-4 text-center",
                                    style: {
                                        backgroundColor: `${GOLD}15`,
                                        border: `1px solid ${GOLD}40`
                                    },
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        style: {
                                            color: GOLD,
                                            fontSize: 22,
                                            fontFamily: "serif"
                                        },
                                        children: [
                                            new Date(formData.date + "T12:00:00").toLocaleDateString("en-US", {
                                                month: "long",
                                                day: "numeric",
                                                year: "numeric"
                                            }),
                                            " — ",
                                            (()=>{
                                                const [h, m] = formData.time.split(":");
                                                const hour = parseInt(h);
                                                const ampm = hour >= 12 ? "PM" : "AM";
                                                return `${hour % 12 || 12}:${m} ${ampm}`;
                                            })()
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/sottovento/components/booking-section.tsx",
                                        lineNumber: 933,
                                        columnNumber: 19
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                    lineNumber: 932,
                                    columnNumber: 17
                                }, this),
                                isRoundTrip && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "space-y-4",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-white/50",
                                            style: {
                                                fontSize: 15
                                            },
                                            children: "Return trip details:"
                                        }, void 0, false, {
                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                            lineNumber: 949,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "grid grid-cols-1 sm:grid-cols-2 gap-4",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            style: labelStyle,
                                                            children: "Return Date *"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                                            lineNumber: 952,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            type: "date",
                                                            value: formData.returnDate,
                                                            onChange: (e)=>setFormData({
                                                                    ...formData,
                                                                    returnDate: e.target.value
                                                                }),
                                                            className: inputClass,
                                                            style: inputStyle
                                                        }, void 0, false, {
                                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                                            lineNumber: 953,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                    lineNumber: 951,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            style: labelStyle,
                                                            children: "Return Pickup Time *"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                                            lineNumber: 956,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            type: "time",
                                                            value: formData.returnTime,
                                                            onChange: (e)=>setFormData({
                                                                    ...formData,
                                                                    returnTime: e.target.value
                                                                }),
                                                            className: inputClass,
                                                            style: inputStyle
                                                        }, void 0, false, {
                                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                                            lineNumber: 957,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                    lineNumber: 955,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "sm:col-span-2",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            style: labelStyle,
                                                            children: "Return Pickup Location"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                                            lineNumber: 960,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            type: "text",
                                                            value: formData.returnPickupLocation,
                                                            onChange: (e)=>setFormData({
                                                                    ...formData,
                                                                    returnPickupLocation: e.target.value
                                                                }),
                                                            placeholder: "Same as drop-off if blank",
                                                            className: inputClass,
                                                            style: inputStyle
                                                        }, void 0, false, {
                                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                                            lineNumber: 961,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                    lineNumber: 959,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                            lineNumber: 950,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                    lineNumber: 948,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            style: labelStyle,
                                            children: "✈ Flight Number (Optional)"
                                        }, void 0, false, {
                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                            lineNumber: 969,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "text",
                                            value: formData.flightNumber,
                                            onChange: (e)=>setFormData({
                                                    ...formData,
                                                    flightNumber: e.target.value
                                                }),
                                            placeholder: "AA1234",
                                            className: inputClass,
                                            style: inputStyle
                                        }, void 0, false, {
                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                            lineNumber: 970,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                    lineNumber: 968,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex gap-3",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "button",
                                            onClick: ()=>setStep(2),
                                            className: "flex-1 py-4 rounded-lg border text-white/60 font-medium transition hover:border-white/30",
                                            style: {
                                                borderColor: "rgba(255,255,255,0.15)",
                                                fontSize: 16
                                            },
                                            children: "← Back"
                                        }, void 0, false, {
                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                            lineNumber: 981,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "button",
                                            onClick: ()=>setStep(4),
                                            disabled: !formData.date || !formData.time,
                                            className: "flex-[2] py-4 rounded-lg font-medium tracking-widest uppercase transition disabled:opacity-40",
                                            style: {
                                                backgroundColor: GOLD,
                                                color: "#000",
                                                fontSize: 18
                                            },
                                            children: "Continue →"
                                        }, void 0, false, {
                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                            lineNumber: 982,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                    lineNumber: 980,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/sottovento/components/booking-section.tsx",
                            lineNumber: 887,
                            columnNumber: 13
                        }, this),
                        step === 4 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "space-y-6",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                    className: "text-white font-light",
                                    style: {
                                        fontSize: 24,
                                        fontFamily: "serif"
                                    },
                                    children: "Your information"
                                }, void 0, false, {
                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                    lineNumber: 990,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "space-y-4",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    style: labelStyle,
                                                    children: "👤 Full Name *"
                                                }, void 0, false, {
                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                    lineNumber: 996,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    type: "text",
                                                    value: formData.name,
                                                    onChange: (e)=>setFormData({
                                                            ...formData,
                                                            name: e.target.value
                                                        }),
                                                    placeholder: "John Doe",
                                                    className: inputClass,
                                                    style: inputStyle
                                                }, void 0, false, {
                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                    lineNumber: 997,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                            lineNumber: 995,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    style: labelStyle,
                                                    children: "📱 Phone Number *"
                                                }, void 0, false, {
                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                    lineNumber: 1007,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    type: "tel",
                                                    value: formData.phone,
                                                    onChange: (e)=>setFormData({
                                                            ...formData,
                                                            phone: e.target.value
                                                        }),
                                                    placeholder: "+1 (555) 000-0000",
                                                    className: inputClass,
                                                    style: inputStyle
                                                }, void 0, false, {
                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                    lineNumber: 1008,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                            lineNumber: 1006,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    style: labelStyle,
                                                    children: "✉ Email *"
                                                }, void 0, false, {
                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                    lineNumber: 1018,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    type: "email",
                                                    value: formData.email,
                                                    onChange: (e)=>setFormData({
                                                            ...formData,
                                                            email: e.target.value
                                                        }),
                                                    placeholder: "john@example.com",
                                                    className: inputClass,
                                                    style: inputStyle
                                                }, void 0, false, {
                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                    lineNumber: 1019,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                            lineNumber: 1017,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    style: labelStyle,
                                                    children: "📝 Notes (Optional)"
                                                }, void 0, false, {
                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                    lineNumber: 1029,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                                                    value: formData.notes,
                                                    onChange: (e)=>setFormData({
                                                            ...formData,
                                                            notes: e.target.value
                                                        }),
                                                    placeholder: "Special requests, child seat, etc.",
                                                    rows: 3,
                                                    className: inputClass,
                                                    style: {
                                                        fontSize: 18,
                                                        paddingTop: 14,
                                                        paddingBottom: 14,
                                                        resize: "none"
                                                    }
                                                }, void 0, false, {
                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                    lineNumber: 1030,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                            lineNumber: 1028,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                    lineNumber: 994,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex gap-3",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "button",
                                            onClick: ()=>setStep(3),
                                            className: "flex-1 py-4 rounded-lg border text-white/60 font-medium transition hover:border-white/30",
                                            style: {
                                                borderColor: "rgba(255,255,255,0.15)",
                                                fontSize: 16
                                            },
                                            children: "← Back"
                                        }, void 0, false, {
                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                            lineNumber: 1042,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "button",
                                            onClick: ()=>setStep(5),
                                            disabled: !formData.name || !formData.phone || !formData.email,
                                            className: "flex-[2] py-4 rounded-lg font-medium tracking-widest uppercase transition disabled:opacity-40",
                                            style: {
                                                backgroundColor: GOLD,
                                                color: "#000",
                                                fontSize: 18
                                            },
                                            children: "Review →"
                                        }, void 0, false, {
                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                            lineNumber: 1043,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                    lineNumber: 1041,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/sottovento/components/booking-section.tsx",
                            lineNumber: 989,
                            columnNumber: 13
                        }, this),
                        step === 5 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "space-y-6",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                    className: "text-white font-light",
                                    style: {
                                        fontSize: 24,
                                        fontFamily: "serif"
                                    },
                                    children: "Trip Summary"
                                }, void 0, false, {
                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                    lineNumber: 1051,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "rounded-xl border p-6 space-y-3",
                                    style: {
                                        borderColor: `${GOLD}40`,
                                        backgroundColor: `${GOLD}08`
                                    },
                                    children: [
                                        !isHourly && formData.pickupZone && formData.dropoffZone && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex justify-between items-center",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-white/50",
                                                    style: {
                                                        fontSize: 15
                                                    },
                                                    children: "Route"
                                                }, void 0, false, {
                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                    lineNumber: 1059,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-white text-right",
                                                    style: {
                                                        fontSize: 16
                                                    },
                                                    children: [
                                                        __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$lib$2f$zones$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ZONES"].find((z)=>z.id === formData.pickupZone)?.label?.split(" /")[0],
                                                        " → ",
                                                        __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$lib$2f$zones$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ZONES"].find((z)=>z.id === formData.dropoffZone)?.label?.split(" /")[0]
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                    lineNumber: 1060,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                            lineNumber: 1058,
                                            columnNumber: 19
                                        }, this),
                                        routeCalc.route && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex justify-between items-center",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-white/50",
                                                    style: {
                                                        fontSize: 15
                                                    },
                                                    children: "Distance"
                                                }, void 0, false, {
                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                    lineNumber: 1068,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-white/70",
                                                    style: {
                                                        fontSize: 15
                                                    },
                                                    children: [
                                                        routeCalc.route.distanceMiles,
                                                        " mi · ",
                                                        routeCalc.route.durationText
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                    lineNumber: 1069,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                            lineNumber: 1067,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex justify-between items-center",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-white/50",
                                                    style: {
                                                        fontSize: 15
                                                    },
                                                    children: "Vehicle"
                                                }, void 0, false, {
                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                    lineNumber: 1075,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-white",
                                                    style: {
                                                        fontSize: 16
                                                    },
                                                    children: effectiveVehicle
                                                }, void 0, false, {
                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                    lineNumber: 1076,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                            lineNumber: 1074,
                                            columnNumber: 17
                                        }, this),
                                        formData.date && formData.time && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex justify-between items-center",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-white/50",
                                                    style: {
                                                        fontSize: 15
                                                    },
                                                    children: "Date & Time"
                                                }, void 0, false, {
                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                    lineNumber: 1080,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-white",
                                                    style: {
                                                        fontSize: 16
                                                    },
                                                    children: [
                                                        new Date(formData.date + "T12:00:00").toLocaleDateString("en-US", {
                                                            month: "short",
                                                            day: "numeric"
                                                        }),
                                                        " — ",
                                                        (()=>{
                                                            const [h, m] = formData.time.split(":");
                                                            const hour = parseInt(h);
                                                            return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
                                                        })()
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                    lineNumber: 1081,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                            lineNumber: 1079,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex justify-between items-center",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-white/50",
                                                    style: {
                                                        fontSize: 15
                                                    },
                                                    children: "Passenger"
                                                }, void 0, false, {
                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                    lineNumber: 1087,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-white",
                                                    style: {
                                                        fontSize: 16
                                                    },
                                                    children: formData.name
                                                }, void 0, false, {
                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                    lineNumber: 1088,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                            lineNumber: 1086,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "border-t my-2",
                                            style: {
                                                borderColor: `${GOLD}30`
                                            }
                                        }, void 0, false, {
                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                            lineNumber: 1090,
                                            columnNumber: 17
                                        }, this),
                                        price !== null && !isOutOfArea ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex justify-between items-center",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            style: {
                                                                color: GOLD,
                                                                fontSize: 16
                                                            },
                                                            children: "Estimated Price"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                                            lineNumber: 1094,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "text-white font-light",
                                                            style: {
                                                                fontSize: 28
                                                            },
                                                            children: [
                                                                "$",
                                                                price
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                                            lineNumber: 1095,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                    lineNumber: 1093,
                                                    columnNumber: 21
                                                }, this),
                                                priceBreakdown && priceBreakdown.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-white/30 text-xs text-right",
                                                    children: priceBreakdown.join(" · ")
                                                }, void 0, false, {
                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                    lineNumber: 1098,
                                                    columnNumber: 23
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-white/30 text-xs text-right",
                                                    children: "Guaranteed price. No surprises."
                                                }, void 0, false, {
                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                    lineNumber: 1100,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex justify-between items-center",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    style: {
                                                        color: GOLD,
                                                        fontSize: 16
                                                    },
                                                    children: "Price"
                                                }, void 0, false, {
                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                    lineNumber: 1104,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    style: {
                                                        color: GOLD,
                                                        fontSize: 18
                                                    },
                                                    children: "To be confirmed"
                                                }, void 0, false, {
                                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                                    lineNumber: 1105,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                            lineNumber: 1103,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                    lineNumber: 1056,
                                    columnNumber: 15
                                }, this),
                                !isHourly && canPay && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: handlePayment,
                                    disabled: paying,
                                    className: "w-full py-5 rounded-xl font-medium tracking-widest uppercase transition disabled:opacity-50",
                                    style: {
                                        backgroundColor: GOLD,
                                        color: "#000",
                                        fontSize: 18
                                    },
                                    children: paying ? "Redirecting..." : `Confirm & Pay — $${price}`
                                }, void 0, false, {
                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                    lineNumber: 1112,
                                    columnNumber: 17
                                }, this),
                                !isHourly && !canPay && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "space-y-3",
                                    children: isOutOfArea ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "rounded-xl border p-4 text-center",
                                        style: {
                                            borderColor: "rgba(255,165,0,0.3)",
                                            backgroundColor: "rgba(255,165,0,0.05)"
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                style: {
                                                    color: "rgba(255,200,100,0.9)",
                                                    fontSize: 15
                                                },
                                                children: "This route may be outside our standard service area."
                                            }, void 0, false, {
                                                fileName: "[project]/sottovento/components/booking-section.tsx",
                                                lineNumber: 1128,
                                                columnNumber: 23
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-white/40 mt-1",
                                                style: {
                                                    fontSize: 14
                                                },
                                                children: "Send your request below and we'll confirm availability."
                                            }, void 0, false, {
                                                fileName: "[project]/sottovento/components/booking-section.tsx",
                                                lineNumber: 1129,
                                                columnNumber: 23
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/sottovento/components/booking-section.tsx",
                                        lineNumber: 1127,
                                        columnNumber: 21
                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "rounded-xl border p-4 text-center",
                                        style: {
                                            borderColor: `${GOLD}40`,
                                            backgroundColor: `${GOLD}08`
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                style: {
                                                    color: GOLD,
                                                    fontSize: 15
                                                },
                                                children: "Custom route — price to be confirmed"
                                            }, void 0, false, {
                                                fileName: "[project]/sottovento/components/booking-section.tsx",
                                                lineNumber: 1133,
                                                columnNumber: 23
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-white/40 mt-1",
                                                style: {
                                                    fontSize: 14
                                                },
                                                children: "Send your request and we'll reply with a guaranteed quote."
                                            }, void 0, false, {
                                                fileName: "[project]/sottovento/components/booking-section.tsx",
                                                lineNumber: 1134,
                                                columnNumber: 23
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/sottovento/components/booking-section.tsx",
                                        lineNumber: 1132,
                                        columnNumber: 21
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                    lineNumber: 1125,
                                    columnNumber: 17
                                }, this),
                                payError && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-red-400 text-sm text-center",
                                    children: payError
                                }, void 0, false, {
                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                    lineNumber: 1140,
                                    columnNumber: 28
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "grid grid-cols-3 gap-3",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                            href: `mailto:contact@sottoventoluxuryride.com?subject=${encodeURIComponent("Sottovento Booking Request")}&body=${encoded}`,
                                            onClick: ()=>setSubmitted(true),
                                            className: "py-4 rounded-xl border text-center transition",
                                            style: {
                                                borderColor: "rgba(255,255,255,0.15)",
                                                color: "rgba(255,255,255,0.6)",
                                                fontSize: 14
                                            },
                                            children: "✉ Email"
                                        }, void 0, false, {
                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                            lineNumber: 1144,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                            href: `sms:+14073830647?&body=${encoded}`,
                                            onClick: ()=>setSubmitted(true),
                                            className: "py-4 rounded-xl border text-center transition",
                                            style: {
                                                borderColor: "rgba(255,255,255,0.15)",
                                                color: "rgba(255,255,255,0.6)",
                                                fontSize: 14
                                            },
                                            children: "💬 SMS"
                                        }, void 0, false, {
                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                            lineNumber: 1152,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                            href: `https://wa.me/14073830647?text=${encoded}`,
                                            target: "_blank",
                                            rel: "noreferrer",
                                            onClick: ()=>setSubmitted(true),
                                            className: "py-4 rounded-xl border text-center transition",
                                            style: {
                                                borderColor: "rgba(255,255,255,0.15)",
                                                color: "rgba(255,255,255,0.6)",
                                                fontSize: 14
                                            },
                                            children: "📱 WhatsApp"
                                        }, void 0, false, {
                                            fileName: "[project]/sottovento/components/booking-section.tsx",
                                            lineNumber: 1160,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                    lineNumber: 1143,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-white/25 text-xs text-center",
                                    children: "Choose how to send your request. No app required."
                                }, void 0, false, {
                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                    lineNumber: 1172,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: ()=>setStep(4),
                                    className: "w-full py-3 text-white/40 text-sm transition hover:text-white/60",
                                    children: "← Edit Information"
                                }, void 0, false, {
                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                    lineNumber: 1176,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/sottovento/components/booking-section.tsx",
                            lineNumber: 1050,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/sottovento/components/booking-section.tsx",
                    lineNumber: 525,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/sottovento/components/booking-section.tsx",
                lineNumber: 524,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed bottom-6 right-4 z-50",
                children: [
                    supportOpen && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "absolute bottom-16 right-0 w-64 rounded-2xl border p-4 space-y-2 shadow-2xl",
                        style: {
                            backgroundColor: "#111",
                            borderColor: "rgba(255,255,255,0.12)"
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-white/40 text-xs text-center mb-3",
                                children: "Your ride is monitored for your safety."
                            }, void 0, false, {
                                fileName: "[project]/sottovento/components/booking-section.tsx",
                                lineNumber: 1192,
                                columnNumber: 13
                            }, this),
                            [
                                {
                                    label: "📞 Contact Driver",
                                    href: `tel:+14073830647`
                                },
                                {
                                    label: "📍 Share Trip",
                                    href: `https://wa.me/14073830647?text=I'm sharing my trip location`
                                },
                                {
                                    label: "💬 Contact Support",
                                    href: `https://wa.me/14073830647`
                                },
                                {
                                    label: "🚨 Call 911",
                                    href: `tel:911`
                                }
                            ].map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                    href: item.href,
                                    target: item.href.startsWith("http") ? "_blank" : undefined,
                                    rel: "noreferrer",
                                    className: "block w-full py-3 px-4 rounded-lg border text-center text-white/70 transition hover:border-white/30",
                                    style: {
                                        borderColor: "rgba(255,255,255,0.1)",
                                        fontSize: 15
                                    },
                                    children: item.label
                                }, item.label, false, {
                                    fileName: "[project]/sottovento/components/booking-section.tsx",
                                    lineNumber: 1199,
                                    columnNumber: 15
                                }, this))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/sottovento/components/booking-section.tsx",
                        lineNumber: 1188,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>setSupportOpen(!supportOpen),
                        className: "rounded-full px-4 py-3 shadow-lg transition",
                        style: {
                            backgroundColor: "#1a1a1a",
                            border: `1px solid ${GOLD}50`,
                            color: GOLD,
                            fontSize: 13
                        },
                        children: supportOpen ? "✕" : "🛡 Ride Support"
                    }, void 0, false, {
                        fileName: "[project]/sottovento/components/booking-section.tsx",
                        lineNumber: 1212,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/sottovento/components/booking-section.tsx",
                lineNumber: 1186,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/sottovento/components/booking-section.tsx",
        lineNumber: 519,
        columnNumber: 5
    }, this);
}
_s(BookingInner, "6ObtFw16ttnLpjWKCNpjyBG9Syg=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSearchParams"],
        __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$hooks$2f$useAttribution$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAttribution"],
        __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$hooks$2f$useGoogleMapsLoader$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useGoogleMapsLoader"],
        __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$hooks$2f$useZoneValidation$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useZoneValidation"],
        __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$hooks$2f$useRouteCalculator$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouteCalculator"]
    ];
});
_c1 = BookingInner;
function BookingSection() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Suspense"], {
        fallback: null,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(BookingInner, {}, void 0, false, {
            fileName: "[project]/sottovento/components/booking-section.tsx",
            lineNumber: 1227,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/sottovento/components/booking-section.tsx",
        lineNumber: 1226,
        columnNumber: 5
    }, this);
}
_c2 = BookingSection;
var _c, _c1, _c2;
__turbopack_context__.k.register(_c, "StepBar");
__turbopack_context__.k.register(_c1, "BookingInner");
__turbopack_context__.k.register(_c2, "BookingSection");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/sottovento/components/whatsapp-button.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "WhatsAppButton",
    ()=>WhatsAppButton
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sottovento/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$message$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__MessageCircle$3e$__ = __turbopack_context__.i("[project]/sottovento/node_modules/lucide-react/dist/esm/icons/message-circle.js [app-client] (ecmascript) <export default as MessageCircle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sottovento/components/ui/button.tsx [app-client] (ecmascript)");
"use client";
;
;
;
function WhatsAppButton() {
    const handleClick = ()=>{
        window.open("https://wa.me/14073830647", "_blank");
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
        onClick: handleClick,
        size: "lg",
        className: "fixed bottom-6 right-6 z-50 rounded-full w-14 h-14 p-0 shadow-2xl hover:scale-110 transition-transform bg-[#25D366] hover:bg-[#20BA5A] text-white border-0",
        "aria-label": "Contact us on WhatsApp",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$message$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__MessageCircle$3e$__["MessageCircle"], {
            className: "w-6 h-6"
        }, void 0, false, {
            fileName: "[project]/sottovento/components/whatsapp-button.tsx",
            lineNumber: 18,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/sottovento/components/whatsapp-button.tsx",
        lineNumber: 12,
        columnNumber: 5
    }, this);
}
_c = WhatsAppButton;
var _c;
__turbopack_context__.k.register(_c, "WhatsAppButton");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/sottovento/components/sticky-book-button.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "StickyBookButton",
    ()=>StickyBookButton
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sottovento/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
"use client";
;
function StickyBookButton() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "fixed bottom-0 left-0 right-0 z-50 block md:hidden",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sottovento$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
            href: "#booking",
            style: {
                display: "block",
                width: "100%",
                backgroundColor: "#C8A96A",
                color: "#000",
                textAlign: "center",
                padding: "16px",
                fontWeight: 700,
                fontSize: "0.95rem",
                letterSpacing: "0.12em",
                textDecoration: "none"
            },
            children: "BOOK NOW"
        }, void 0, false, {
            fileName: "[project]/sottovento/components/sticky-book-button.tsx",
            lineNumber: 6,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/sottovento/components/sticky-book-button.tsx",
        lineNumber: 5,
        columnNumber: 5
    }, this);
}
_c = StickyBookButton;
var _c;
__turbopack_context__.k.register(_c, "StickyBookButton");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=sottovento_28c57b76._.js.map