import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Calendar, 
  BookOpen, 
  Search,
  Sparkles,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  color: string; // SVG 颜色值（十六进制）
}

interface FloatingActionMenuProps {
  onDailyReport?: () => void;
  onWeeklyReport?: () => void;
  onBlog?: () => void;
  onResearch?: () => void;
  onHelp?: () => void;
}

export function FloatingActionMenu({
  onDailyReport,
  onWeeklyReport,
  onBlog,
  onResearch,
  onHelp,
}: FloatingActionMenuProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 菜单项配置 - 黑白灰配色
  const menuItems: MenuItem[] = [
    {
      id: 'daily',
      label: '日报',
      icon: <FileText className="h-5 w-5" />,
      onClick: () => {
        onDailyReport?.();
        setIsExpanded(false);
      },
      color: '#6b7280', // gray-500
    },
    {
      id: 'weekly',
      label: '周报',
      icon: <Calendar className="h-5 w-5" />,
      onClick: () => {
        onWeeklyReport?.();
        setIsExpanded(false);
      },
      color: '#4b5563', // gray-600
    },
    {
      id: 'blog',
      label: '博客',
      icon: <BookOpen className="h-5 w-5" />,
      onClick: () => {
        onBlog?.();
        setIsExpanded(false);
      },
      color: '#374151', // gray-700
    },
    {
      id: 'research',
      label: '调研',
      icon: <Search className="h-5 w-5" />,
      onClick: () => {
        onResearch?.();
        setIsExpanded(false);
      },
      color: '#1f2937', // gray-800
    },
  ];

  // 计算扇形的角度范围
  const getSectorAngles = (index: number, total: number) => {
    const anglePerSector = 360 / total;
    const startAngle = -90 + (anglePerSector * index); // 从上方开始
    const endAngle = startAngle + anglePerSector;
    
    return {
      startAngle,
      endAngle,
      centerAngle: startAngle + anglePerSector / 2, // 扇形中心角度
    };
  };

  // 点击外部区域关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
        setIsHovering(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded]);

  // 生成 SVG 路径用于扇形
  const createSectorPath = (startAngle: number, endAngle: number, innerRadius: number, outerRadius: number) => {
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    
    const x1 = Math.cos(startRad) * innerRadius;
    const y1 = Math.sin(startRad) * innerRadius;
    const x2 = Math.cos(startRad) * outerRadius;
    const y2 = Math.sin(startRad) * outerRadius;
    const x3 = Math.cos(endRad) * outerRadius;
    const y3 = Math.sin(endRad) * outerRadius;
    const x4 = Math.cos(endRad) * innerRadius;
    const y4 = Math.sin(endRad) * innerRadius;
    
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    
    return `M ${x1} ${y1} L ${x2} ${y2} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x3} ${y3} L ${x4} ${y4} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x1} ${y1} Z`;
  };

  const buttonSize = 56; // 中心按钮大小（展开时）
  const buttonSizeCollapsed = 40; // 中心按钮大小（折叠时）
  // 内圆半径 = 中心按钮半径（减去边框宽度，确保完全贴合）
  const borderWidth = 2; // 按钮边框宽度
  const innerRadius = (buttonSize - borderWidth * 2) / 2; // 减去边框后的实际半径
  const outerRadius = 90; // 外圆半径
  const size = 220; // SVG 总大小

  // 处理鼠标进入/离开
  const handleMouseEnter = () => {
    setIsHovering(true);
    setIsExpanded(true);
  };

  const handleMouseLeave = () => {
    // 立即恢复，不延迟
    setIsHovering(false);
    setIsExpanded(false);
  };

  // 处理中心按钮点击
  const handleCenterButtonClick = () => {
    if (isExpanded) {
      // 已展开时，点击显示帮助
      onHelp?.();
      setIsHelpOpen(true);
    } else {
      // 未展开时，点击显示帮助
      onHelp?.();
      setIsHelpOpen(true);
    }
  };

  return (
    <div
      ref={containerRef}
      className="fixed bottom-8 left-4 z-50 relative"
      style={{
        width: isExpanded || isHovering ? size : buttonSizeCollapsed,
        height: isExpanded || isHovering ? size : buttonSizeCollapsed,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* SVG 容器 - 同心圆扇形布局 */}
      <div
        ref={menuRef}
        className={cn(
          'absolute transition-all duration-300 ease-out',
          isExpanded || isHovering
            ? 'opacity-100 scale-100'
            : 'opacity-0 scale-0 pointer-events-none'
        )}
        style={{
          width: size,
          height: size,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          transformOrigin: 'center',
        }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="absolute inset-0"
        >
          {/* 将坐标原点移到中心 */}
          <g transform={`translate(${size / 2}, ${size / 2})`}>
          {/* 扇形菜单项 */}
          {menuItems.map((item, index) => {
            const { startAngle, endAngle, centerAngle } = getSectorAngles(index, menuItems.length);
            const path = createSectorPath(startAngle, endAngle, innerRadius, outerRadius);
            const isHovered = hoveredItem === item.id;
            
            // 计算图标位置（扇形中心）
            const iconRadius = (innerRadius + outerRadius) / 2;
            const iconAngle = centerAngle;
            const iconX = Math.cos((iconAngle * Math.PI) / 180) * iconRadius;
            const iconY = Math.sin((iconAngle * Math.PI) / 180) * iconRadius;
            
            return (
              <g key={item.id}>
                {/* 扇形背景 */}
                <path
                  d={path}
                  fill={item.color}
                  className={cn(
                    'transition-all duration-200 cursor-pointer',
                    isHovered ? 'opacity-100' : 'opacity-90',
                    'hover:opacity-100'
                  )}
                  style={{
                    filter: isHovered ? 'brightness(1.15)' : 'brightness(1)',
                  }}
                  onMouseEnter={() => setHoveredItem(item.id)}
                  onMouseLeave={() => setHoveredItem(null)}
                  onClick={item.onClick}
                />
                {/* 扇形图标 */}
                <foreignObject
                  x={iconX - 12}
                  y={iconY - 12}
                  width={24}
                  height={24}
                  className="pointer-events-none"
                >
                  <div className="flex items-center justify-center w-full h-full text-white dark:text-gray-100">
                    {item.icon}
                  </div>
                </foreignObject>
                {/* 扇形标签 */}
                {(isExpanded || isHovering) && (
                  <text
                    x={Math.cos((iconAngle * Math.PI) / 180) * (iconRadius + 15)}
                    y={Math.sin((iconAngle * Math.PI) / 180) * (iconRadius + 15)}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-xs fill-white font-medium pointer-events-none"
                    style={{
                      fontSize: '12px',
                      filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))',
                    }}
                  >
                    {item.label}
                  </text>
                )}
              </g>
            );
          })}
          </g>
        </svg>
      </div>

      {/* 中心按钮 - 始终显示星号，点击显示帮助 */}
      <div
        className="absolute z-10"
        style={{
          width: isExpanded || isHovering ? buttonSize : buttonSizeCollapsed,
          height: isExpanded || isHovering ? buttonSize : buttonSizeCollapsed,
          left: '50%',
          top: '50%',
          transform: isExpanded || isHovering
            ? 'translate(-50%, -50%) translate(2px, 2px)'
            : 'translate(-50%, -50%)',
        }}
      >
        <Button
          onClick={handleCenterButtonClick}
          className={cn(
            'rounded-full shadow-xl w-full h-full',
            'bg-gray-900 dark:bg-gray-100',
            'hover:bg-gray-800 dark:hover:bg-gray-200',
            'text-white dark:text-gray-900 border-2 border-white dark:border-gray-800',
            'flex items-center justify-center',
            'transition-all duration-300 ease-out',
            'hover:scale-110 active:scale-95',
            'backdrop-blur-sm'
          )}
          title="点击查看帮助"
        >
          <Sparkles className={cn('transition-all duration-300', isExpanded || isHovering ? 'h-6 w-6' : 'h-4 w-4')} />
        </Button>
      </div>
    </div>
  );
}

