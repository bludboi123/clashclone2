#define WIN32_LEAN_AND_MEAN
#define NOMINMAX
#include <Windows.h>
#include <windowsx.h>
#include <string>
#include <vector>

struct Module {
    const wchar_t* name;
    const wchar_t* description;
    bool enabled;
    int hotkey;
};

static std::vector<Module> g_modules = {
    {L"HUD Demo",          L"Show a sample status overlay in this app", false, VK_F1},
    {L"Coordinates Demo",  L"Show example X / Y / Z values",            false, VK_F2},
    {L"Keystrokes Demo",   L"Display a sample WASD keyboard panel",      false, VK_F3},
    {L"Movement Test",     L"Toggle a local test indicator only",       false, VK_F4},
    {L"Distance Display",  L"Display a sample distance readout",        false, VK_F5},
};

static constexpr COLORREF BG = RGB(20, 22, 29);
static constexpr COLORREF PANEL = RGB(31, 35, 45);
static constexpr COLORREF TEXT = RGB(235, 238, 245);
static constexpr COLORREF MUTED = RGB(151, 160, 176);
static constexpr COLORREF ACCENT = RGB(88, 166, 255);
static constexpr COLORREF GREEN = RGB(75, 205, 130);

static HFONT g_titleFont = nullptr;
static HFONT g_bodyFont = nullptr;
static HFONT g_smallFont = nullptr;

static RECT RowRect(int index) {
    RECT r{20, 100 + index * 76, 560, 166 + index * 76};
    return r;
}

static void SetFont(HDC dc, HFONT font) {
    SelectObject(dc, font);
}

static void DrawTextAt(HDC dc, const wchar_t* text, int x, int y, COLORREF color, HFONT font) {
    SetTextColor(dc, color);
    SetBkMode(dc, TRANSPARENT);
    SetFont(dc, font);
    TextOutW(dc, x, y, text, static_cast<int>(wcslen(text)));
}

static void FillRectColor(HDC dc, const RECT& r, COLORREF color) {
    HBRUSH brush = CreateSolidBrush(color);
    FillRect(dc, &r, brush);
    DeleteObject(brush);
}

static void DrawRoundedPanel(HDC dc, RECT r, COLORREF color) {
    HBRUSH brush = CreateSolidBrush(color);
    HPEN pen = CreatePen(PS_SOLID, 1, color);
    HGDIOBJ oldBrush = SelectObject(dc, brush);
    HGDIOBJ oldPen = SelectObject(dc, pen);
    RoundRect(dc, r.left, r.top, r.right, r.bottom, 12, 12);
    SelectObject(dc, oldBrush);
    SelectObject(dc, oldPen);
    DeleteObject(brush);
    DeleteObject(pen);
}

static void Paint(HWND hwnd) {
    PAINTSTRUCT ps{};
    HDC dc = BeginPaint(hwnd, &ps);
    RECT client{};
    GetClientRect(hwnd, &client);
    FillRectColor(dc, client, BG);

    DrawTextAt(dc, L"MCEdu Client", 22, 20, TEXT, g_titleFont);
    DrawTextAt(dc, L"Standalone GUI prototype  |  Demo toggles only", 23, 56, MUTED, g_smallFont);

    RECT topPill{430, 24, 558, 52};
    DrawRoundedPanel(dc, topPill, RGB(39, 57, 52));
    DrawTextAt(dc, L"●  LOCAL UI", 444, 31, GREEN, g_smallFont);

    for (int i = 0; i < static_cast<int>(g_modules.size()); ++i) {
        RECT row = RowRect(i);
        DrawRoundedPanel(dc, row, PANEL);
        DrawTextAt(dc, g_modules[i].name, 36, row.top + 12, TEXT, g_bodyFont);
        DrawTextAt(dc, g_modules[i].description, 36, row.top + 39, MUTED, g_smallFont);

        RECT toggle{474, row.top + 20, 540, row.top + 46};
        COLORREF toggleColor = g_modules[i].enabled ? GREEN : RGB(76, 83, 98);
        DrawRoundedPanel(dc, toggle, toggleColor);
        const wchar_t* state = g_modules[i].enabled ? L"ON" : L"OFF";
        SIZE sz{};
        GetTextExtentPoint32W(dc, state, 3, &sz);
        DrawTextAt(dc, state, toggle.left + (66 - sz.cx) / 2, toggle.top + 5, RGB(255,255,255), g_smallFont);
    }

    DrawTextAt(dc, L"Hotkeys work while this window is focused: F1–F5 toggle modules, Esc exits.",
               22, 493, MUTED, g_smallFont);
    DrawTextAt(dc, L"This app does not connect to or modify Minecraft Education.",
               22, 516, RGB(225, 176, 96), g_smallFont);
    EndPaint(hwnd, &ps);
}

static void ToggleModule(int index, HWND hwnd) {
    if (index >= 0 && index < static_cast<int>(g_modules.size())) {
        g_modules[index].enabled = !g_modules[index].enabled;
        InvalidateRect(hwnd, nullptr, TRUE);
    }
}

static LRESULT CALLBACK WindowProc(HWND hwnd, UINT msg, WPARAM wParam, LPARAM lParam) {
    switch (msg) {
    case WM_CREATE:
        g_titleFont = CreateFontW(25, 0, 0, 0, FW_BOLD, FALSE, FALSE, FALSE,
            DEFAULT_CHARSET, OUT_DEFAULT_PRECIS, CLIP_DEFAULT_PRECIS, CLEARTYPE_QUALITY,
            DEFAULT_PITCH | FF_DONTCARE, L"Segoe UI");
        g_bodyFont = CreateFontW(17, 0, 0, 0, FW_SEMIBOLD, FALSE, FALSE, FALSE,
            DEFAULT_CHARSET, OUT_DEFAULT_PRECIS, CLIP_DEFAULT_PRECIS, CLEARTYPE_QUALITY,
            DEFAULT_PITCH | FF_DONTCARE, L"Segoe UI");
        g_smallFont = CreateFontW(12, 0, 0, 0, FW_NORMAL, FALSE, FALSE, FALSE,
            DEFAULT_CHARSET, OUT_DEFAULT_PRECIS, CLIP_DEFAULT_PRECIS, CLEARTYPE_QUALITY,
            DEFAULT_PITCH | FF_DONTCARE, L"Segoe UI");
        return 0;
    case WM_PAINT:
        Paint(hwnd);
        return 0;
    case WM_LBUTTONDOWN: {
        POINT p{GET_X_LPARAM(lParam), GET_Y_LPARAM(lParam)};
        for (int i = 0; i < static_cast<int>(g_modules.size()); ++i) {
            RECT row = RowRect(i);
            RECT toggle{450, row.top, 560, row.bottom};
            if (PtInRect(&row, p) || PtInRect(&toggle, p)) {
                ToggleModule(i, hwnd);
                break;
            }
        }
        return 0;
    }
    case WM_KEYDOWN:
        if (wParam == VK_ESCAPE) {
            DestroyWindow(hwnd);
            return 0;
        }
        for (int i = 0; i < static_cast<int>(g_modules.size()); ++i) {
            if (wParam == static_cast<WPARAM>(g_modules[i].hotkey)) {
                ToggleModule(i, hwnd);
                return 0;
            }
        }
        break;
    case WM_DESTROY:
        if (g_titleFont) DeleteObject(g_titleFont);
        if (g_bodyFont) DeleteObject(g_bodyFont);
        if (g_smallFont) DeleteObject(g_smallFont);
        PostQuitMessage(0);
        return 0;
    }
    return DefWindowProcW(hwnd, msg, wParam, lParam);
}

int WINAPI wWinMain(HINSTANCE instance, HINSTANCE, PWSTR, int show) {
    const wchar_t CLASS_NAME[] = L"MCEduClientStandaloneWindow";
    WNDCLASSW wc{};
    wc.lpfnWndProc = WindowProc;
    wc.hInstance = instance;
    wc.lpszClassName = CLASS_NAME;
    wc.hCursor = LoadCursor(nullptr, IDC_ARROW);
    wc.hbrBackground = CreateSolidBrush(BG);
    wc.style = CS_HREDRAW | CS_VREDRAW;

    if (!RegisterClassW(&wc)) return 1;

    HWND hwnd = CreateWindowExW(
        0, CLASS_NAME, L"MCEdu Client",
        WS_OVERLAPPED | WS_CAPTION | WS_SYSMENU | WS_MINIMIZEBOX,
        CW_USEDEFAULT, CW_USEDEFAULT, 600, 570,
        nullptr, nullptr, instance, nullptr
    );
    if (!hwnd) return 1;

    ShowWindow(hwnd, show);
    UpdateWindow(hwnd);

    MSG msg{};
    while (GetMessageW(&msg, nullptr, 0, 0) > 0) {
        TranslateMessage(&msg);
        DispatchMessageW(&msg);
    }
    return static_cast<int>(msg.wParam);
}
