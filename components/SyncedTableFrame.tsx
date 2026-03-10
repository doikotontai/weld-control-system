'use client'

import { useEffect, useRef, useState } from 'react'

export default function SyncedTableFrame({
    children,
    className = '',
}: {
    children: React.ReactNode
    className?: string
}) {
    const topScrollRef = useRef<HTMLDivElement | null>(null)
    const bottomScrollRef = useRef<HTMLDivElement | null>(null)
    const contentRef = useRef<HTMLDivElement | null>(null)
    const [scrollWidth, setScrollWidth] = useState(0)

    useEffect(() => {
        const content = contentRef.current
        const topScroller = topScrollRef.current
        const bottomScroller = bottomScrollRef.current
        if (!content) {
            return
        }

        const updateWidths = () => {
            setScrollWidth(content.scrollWidth)
        }

        const syncFromTop = () => {
            if (bottomScroller && topScroller) {
                bottomScroller.scrollLeft = topScroller.scrollLeft
            }
        }

        const syncFromBottom = () => {
            if (bottomScroller && topScroller) {
                topScroller.scrollLeft = bottomScroller.scrollLeft
            }
        }

        updateWidths()

        const resizeObserver = new ResizeObserver(updateWidths)
        resizeObserver.observe(content)

        topScroller?.addEventListener('scroll', syncFromTop)
        bottomScroller?.addEventListener('scroll', syncFromBottom)

        window.addEventListener('resize', updateWidths)

        return () => {
            resizeObserver.disconnect()
            topScroller?.removeEventListener('scroll', syncFromTop)
            bottomScroller?.removeEventListener('scroll', syncFromBottom)
            window.removeEventListener('resize', updateWidths)
        }
    }, [])

    return (
        <div className={`table-sync-shell ${className}`.trim()}>
            <div ref={topScrollRef} className="table-scrollbar table-scrollbar-top">
                <div style={{ width: scrollWidth, height: 1 }} />
            </div>
            <div ref={bottomScrollRef} className="table-scrollbar table-scrollbar-bottom">
                <div ref={contentRef}>{children}</div>
            </div>
        </div>
    )
}
