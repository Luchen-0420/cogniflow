/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    './node_modules/streamdown/dist/**/*.js'
  ],
  safelist: ['border', 'border-border'],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        borderColor: {
          border: 'hsl(var(--border))',
        },
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        education: {
          blue: 'hsl(var(--education-blue))',
          green: 'hsl(var(--education-green))',
        },
        success: 'hsl(var(--success))',
        warning: 'hsl(var(--warning))',
        info: 'hsl(var(--info))',
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
        // 类型颜色系统
        type: {
          task: {
            bg: 'hsl(var(--type-task-bg))',
            text: 'hsl(var(--type-task-text))',
            border: 'hsl(var(--type-task-border))',
          },
          event: {
            bg: 'hsl(var(--type-event-bg))',
            text: 'hsl(var(--type-event-text))',
            border: 'hsl(var(--type-event-border))',
          },
          note: {
            bg: 'hsl(var(--type-note-bg))',
            text: 'hsl(var(--type-note-text))',
            border: 'hsl(var(--type-note-border))',
          },
          data: {
            bg: 'hsl(var(--type-data-bg))',
            text: 'hsl(var(--type-data-text))',
            border: 'hsl(var(--type-data-border))',
          },
          url: {
            bg: 'hsl(var(--type-url-bg))',
            text: 'hsl(var(--type-url-text))',
            border: 'hsl(var(--type-url-border))',
          },
          collection: {
            bg: 'hsl(var(--type-collection-bg))',
            text: 'hsl(var(--type-collection-text))',
            border: 'hsl(var(--type-collection-border))',
          },
        },
        // 状态颜色系统
        status: {
          success: {
            bg: 'hsl(var(--status-success-bg))',
            text: 'hsl(var(--status-success-text))',
            border: 'hsl(var(--status-success-border))',
          },
          warning: {
            bg: 'hsl(var(--status-warning-bg))',
            text: 'hsl(var(--status-warning-text))',
            border: 'hsl(var(--status-warning-border))',
          },
          error: {
            bg: 'hsl(var(--status-error-bg))',
            text: 'hsl(var(--status-error-text))',
            border: 'hsl(var(--status-error-border))',
          },
          info: {
            bg: 'hsl(var(--status-info-bg))',
            text: 'hsl(var(--status-info-text))',
            border: 'hsl(var(--status-info-border))',
          },
        },
        // 优先级颜色系统
        priority: {
          high: {
            border: 'hsl(var(--priority-high-border))',
            bg: 'hsl(var(--priority-high-bg))',
          },
          medium: {
            border: 'hsl(var(--priority-medium-border))',
            bg: 'hsl(var(--priority-medium-bg))',
          },
          low: {
            border: 'hsl(var(--priority-low-border))',
            bg: 'hsl(var(--priority-low-bg))',
          },
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      backgroundImage: {
        'gradient-primary': 'var(--gradient-primary)',
        'gradient-card': 'var(--gradient-card)',
        'gradient-background': 'var(--gradient-background)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
        '2xl': 'var(--shadow-2xl)',
        card: 'var(--shadow-card)',
        hover: 'var(--shadow-hover)',
        inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
        none: 'none',
      },
      transitionDuration: {
        fast: 'var(--transition-fast)',
        normal: 'var(--transition-normal)',
        slow: 'var(--transition-slow)',
        slower: 'var(--transition-slower)',
      },
      transitionTimingFunction: {
        'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
        'fade-in': {
          from: {
            opacity: '0',
            transform: 'translateY(10px)',
          },
          to: {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        'slide-in': {
          from: {
            opacity: '0',
            transform: 'translateX(-20px)',
          },
          to: {
            opacity: '1',
            transform: 'translateX(0)',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.5s ease-out',
        'slide-in': 'slide-in 0.5s ease-out',
      },
    },
  },
  plugins: [
    function ({ addUtilities }) {
      addUtilities(
        {
          '.border-t-solid': { 'border-top-style': 'solid' },
          '.border-r-solid': { 'border-right-style': 'solid' },
          '.border-b-solid': { 'border-bottom-style': 'solid' },
          '.border-l-solid': { 'border-left-style': 'solid' },
          '.border-t-dashed': { 'border-top-style': 'dashed' },
          '.border-r-dashed': { 'border-right-style': 'dashed' },
          '.border-b-dashed': { 'border-bottom-style': 'dashed' },
          '.border-l-dashed': { 'border-left-style': 'dashed' },
          '.border-t-dotted': { 'border-top-style': 'dotted' },
          '.border-r-dotted': { 'border-right-style': 'dotted' },
          '.border-b-dotted': { 'border-bottom-style': 'dotted' },
          '.border-l-dotted': { 'border-left-style': 'dotted' },
        },
        ['responsive']
      );
    },
  ],
};
