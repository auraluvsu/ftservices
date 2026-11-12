import { FormEvent, ReactNode, useEffect, useId, useRef, useState } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet"
import markerIcon from "leaflet/dist/images/marker-icon.png"
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png"
import markerShadow from "leaflet/dist/images/marker-shadow.png"

const ORANGE = "#F56300"
const heroImage = "/hero.jpg"
const usedImage = "/used.jpg"
const outdoorImage = "/outdoor.jpg"
const dieselImage = "/diesel.jpg"
const dieselImage2 = "/diesel-2.jpg"
const lowAngleImage = "/lowangle.jpg"
const clampImage = "/clamp.jpg"
const f20Image = "/f20.jpg"

type IconName = "arrow" | "award" | "calendar" | "check" | "chevron" | "clock" | "close" | "forklift" | "location" | "mail" | "menu" | "phone" | "shield" | "tools" | "truck" | "users"

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
    const paths: Record<IconName, ReactNode> = {
        arrow: (
            <>
                <path d="M5 12h14" />
                <path d="m13 6 6 6-6 6" />
            </>
        ),
        award: (
            <>
                <circle cx="12" cy="8" r="5" />
                <path d="m8.5 12-1.5 9 5-3 5 3-1.5-9" />
            </>
        ),
        calendar: (
            <>
                <rect x="3" y="5" width="18" height="16" rx="3" />
                <path d="M8 3v4M16 3v4M3 10h18" />
            </>
        ),
        check: <path d="m5 12 4 4L19 6" />,
        chevron: <path d="m6 9 6 6 6-6" />,
        clock: (
            <>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
            </>
        ),
        close: <path d="M6 6l12 12M18 6 6 18" />,
        forklift: (
            <>
                <path d="M4 5v11h11M4 9h6l3 7M18 4v14h3M15 18h6" />
                <circle cx="7" cy="18" r="2" />
                <circle cx="15" cy="18" r="2" />
            </>
        ),
        location: (
            <>
                <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
                <circle cx="12" cy="10" r="2.5" />
            </>
        ),
        mail: (
            <>
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m4 7 8 6 8-6" />
            </>
        ),
        menu: <path d="M4 7h16M4 12h16M4 17h16" />,
        phone: (
            <path d="M7.5 3h3l1.5 5-2 1.5a15 15 0 0 0 4.5 4.5l1.5-2 5 1.5v3A3.5 3.5 0 0 1 17.5 20C10 19.5 4.5 14 4 6.5A3.5 3.5 0 0 1 7.5 3Z" />
        ),
        shield: (
            <>
                <path d="M12 3 4.5 6v5c0 5 3 8.5 7.5 10 4.5-1.5 7.5-5 7.5-10V6L12 3Z" />
                <path d="m8.5 12 2.2 2.2 4.8-5" />
            </>
        ),
        tools: (
            <>
                <path d="m14 7 3-3 3 3-3 3M5 19l9-9" />
                <path d="m4 5 4 4M3 3l3 1-2 2-1-3ZM15 15l5 5" />
            </>
        ),
        truck: (
            <>
                <path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z" />
                <circle cx="7" cy="18" r="2" />
                <circle cx="18" cy="18" r="2" />
            </>
        ),
        users: (
            <>
                <circle cx="9" cy="8" r="3" />
                <path d="M3 20c0-4 2-7 6-7s6 3 6 7M16 5a3 3 0 0 1 0 6M18 14c2 .8 3 2.8 3 6" />
            </>
        ),
    }
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            {paths[name]}
        </svg>
    )
}

const routeMap: Record<string, string> = {
    Home: "/",
    "New Forklifts": "/new-forklifts",
    "Used Forklifts": "/used-forklifts",
    "LiuGong Forklifts": "/liugong-forklifts",
    "Forklift Hire": "/forklift-hire",
    "Forklift Services": "/forklift-services",
    Contact: "/contact",
}

function goTo(path: string) {
    window.history.pushState({}, "", path)
    window.dispatchEvent(new PopStateEvent("popstate"))
}

function Link({
    to,
    className = "",
    children,
    onClick,
    "aria-label": ariaLabel,
}: {
    to: string
    className?: string
    children: ReactNode
    onClick?: () => void
    "aria-label"?: string
}) {
    return (
        <a
            href={to}
            className={className}
            aria-label={ariaLabel}
            onClick={(event) => {
                event.preventDefault()
                goTo(to)
                onClick?.()
            }}
        >
            {children}
        </a>
    )
}

function Logo({ light = false }: { light?: boolean }) {
    return (
        <Link
            to="/"
            className={`logo ${light ? "logo--light" : ""}`}
            aria-label="FT Services home"
        >
            <span className="logo__mark">
                <img src="/forklift-logo-black.png" alt="" width={221} height={144} />
            </span>
            <img
                className="logo__wordmark"
                src="/image_9869aef3.jpg"
                alt="FT Services"
                width={2526}
                height={416}
            />
        </Link>
    )
}

function Header({ path }: { path: string }) {
    const [scrolled, setScrolled] = useState(false)
    const [open, setOpen] = useState(false)
    const [usedMenuOpen, setUsedMenuOpen] = useState(
        path === "/diesel-forklifts" || path === "/electric-forklifts",
    )

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 24)
        handleScroll()
        window.addEventListener("scroll", handleScroll, { passive: true })
        return () => window.removeEventListener("scroll", handleScroll)
    }, [])

    useEffect(() => {
        document.body.style.overflow = open ? "hidden" : ""
        return () => {
            document.body.style.overflow = ""
        }
    }, [open])

    // Close on any navigation, including the browser back button.
    useEffect(() => setOpen(false), [path])

    // Close if the viewport grows past the mobile breakpoint (e.g. rotating a tablet),
    // otherwise the hidden menu would leave the page scroll-locked.
    useEffect(() => {
        const mq = window.matchMedia("(max-width: 1180px)")
        const onChange = () => !mq.matches && setOpen(false)
        mq.addEventListener("change", onChange)
        return () => mq.removeEventListener("change", onChange)
    }, [])

    // While open: focus the close button, close on Escape, and keep Tab inside the menu.
    // On close, return focus to the menu button if it was inside the menu.
    const menuButtonRef = useRef<HTMLButtonElement>(null)
    const closeButtonRef = useRef<HTMLButtonElement>(null)
    const panelRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
        const panel = panelRef.current
        if (!open || !panel) return
        closeButtonRef.current?.focus()
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") return setOpen(false)
            if (e.key !== "Tab") return
            const focusable = panel.querySelectorAll<HTMLElement>("a[href], button")
            const first = focusable[0]
            const last = focusable[focusable.length - 1]
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault()
                last.focus()
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault()
                first.focus()
            }
        }
        document.addEventListener("keydown", onKeyDown)
        return () => {
            document.removeEventListener("keydown", onKeyDown)
            if (panel.contains(document.activeElement)) menuButtonRef.current?.focus()
        }
    }, [open])

    return (
        <header className={`header ${scrolled ? "header--scrolled" : ""}`}>
            <div className="header__inner">
                <Logo />
                <nav className="desktop-nav" aria-label="Main navigation">
                    {Object.entries(routeMap).map(([label, href]) =>
                        label === "Used Forklifts" ? (
                            <div className="nav-dropdown" key={label}>
                                <Link
                                    to={href}
                                    className={
                                        path === href ||
                                            path === "/diesel-forklifts" ||
                                            path === "/electric-forklifts"
                                            ? "active"
                                            : ""
                                    }
                                >
                                    {label}
                                    <Icon name="chevron" size={14} />
                                </Link>
                                <div className="nav-dropdown__panel">
                                    <span className="nav-dropdown__eyebrow">
                                        Browse used forklifts
                                    </span>
                                    <Link to="/used-forklifts">
                                        <span>
                                            <Icon name="forklift" size={18} />
                                        </span>
                                        <div>
                                            <strong>All used forklifts</strong>
                                            <small>View the full selection</small>
                                        </div>
                                        <Icon name="arrow" size={16} />
                                    </Link>
                                    <Link to="/diesel-forklifts">
                                        <span>
                                            <Icon name="truck" size={18} />
                                        </span>
                                        <div>
                                            <strong>Diesel forklifts</strong>
                                            <small>For demanding outdoor work</small>
                                        </div>
                                        <Icon name="arrow" size={16} />
                                    </Link>
                                    <Link to="/electric-forklifts">
                                        <span>
                                            <Icon name="forklift" size={18} />
                                        </span>
                                        <div>
                                            <strong>Electric forklifts</strong>
                                            <small>Clean, quiet warehouse power</small>
                                        </div>
                                        <Icon name="arrow" size={16} />
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <Link
                                key={label}
                                to={href}
                                className={path === href ? "active" : ""}
                            >
                                {label}
                            </Link>
                        ),
                    )}
                </nav>
                <div className="header__actions">
                    <a
                        className="button button--ghost header__call"
                        href="tel:07976372870"
                    >
                        <Icon name="phone" size={17} /> Call 07976 372870
                    </a>
                    <Link className="button button--primary" to="/contact">
                        Get a quote <Icon name="arrow" size={17} />
                    </Link>
                </div>
                <button
                    ref={menuButtonRef}
                    className="menu-button"
                    onClick={() => setOpen(true)}
                    aria-expanded={open}
                    aria-controls="mobile-menu"
                    aria-label="Open menu"
                >
                    <Icon name="menu" size={26} />
                </button>
            </div>
            <div
                ref={panelRef}
                id="mobile-menu"
                className={`mobile-menu ${open ? "mobile-menu--open" : ""}`}
                role="dialog"
                aria-modal="true"
                aria-label="Menu"
                inert={!open}
            >
                <div className="mobile-menu__top">
                    <Logo />
                    <button
                        ref={closeButtonRef}
                        className="menu-button"
                        onClick={() => setOpen(false)}
                        aria-label="Close menu"
                    >
                        <Icon name="close" size={26} />
                    </button>
                </div>
                <nav aria-label="Mobile navigation">
                    {Object.entries(routeMap).map(([label, href], index) =>
                        label === "Used Forklifts" ? (
                            <div
                                className={`mobile-nav-group ${usedMenuOpen ? "open" : ""}`}
                                key={label}
                            >
                                <button
                                    className={
                                        path === href ||
                                            path === "/diesel-forklifts" ||
                                            path === "/electric-forklifts"
                                            ? "active"
                                            : ""
                                    }
                                    onClick={() => setUsedMenuOpen(!usedMenuOpen)}
                                    aria-expanded={usedMenuOpen}
                                >
                                    <span>0{index + 1}</span>
                                    {label}
                                    <Icon name="chevron" />
                                </button>
                                <div className="mobile-nav-group__links">
                                    <div>
                                        <Link
                                            to="/used-forklifts"
                                            onClick={() => setOpen(false)}
                                            className={path === "/used-forklifts" ? "active" : ""}
                                        >
                                            Used overview <Icon name="arrow" size={17} />
                                        </Link>
                                        <Link
                                            to="/diesel-forklifts"
                                            onClick={() => setOpen(false)}
                                            className={path === "/diesel-forklifts" ? "active" : ""}
                                        >
                                            Diesel forklifts <Icon name="arrow" size={17} />
                                        </Link>
                                        <Link
                                            to="/electric-forklifts"
                                            onClick={() => setOpen(false)}
                                            className={path === "/electric-forklifts" ? "active" : ""}
                                        >
                                            Electric forklifts <Icon name="arrow" size={17} />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <Link
                                key={label}
                                to={href}
                                onClick={() => setOpen(false)}
                                className={path === href ? "active" : ""}
                            >
                                <span>0{index + 1}</span>
                                {label}
                                <Icon name="arrow" />
                            </Link>
                        ),
                    )}
                </nav>
                <div className="mobile-menu__actions">
                    <a className="button button--dark" href="tel:07976372870">
                        <Icon name="phone" /> Call 07976 372870
                    </a>
                    <Link
                        className="button button--primary"
                        to="/contact"
                        onClick={() => setOpen(false)}
                    >
                        Get a quote <Icon name="arrow" size={17} />
                    </Link>
                </div>
            </div>
        </header>
    )
}

function Reveal({
    children,
    className = "",
    delay = 0,
}: {
    children: ReactNode
    className?: string
    delay?: number
}) {
    const ref = useRef<HTMLDivElement>(null)
    useEffect(() => {
        const el = ref.current
        if (!el) return
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    el.classList.add("is-visible")
                    observer.disconnect()
                }
            },
            { threshold: 0.12 },
        )
        observer.observe(el)
        return () => observer.disconnect()
    }, [])
    return (
        <div
            ref={ref}
            className={`reveal ${className}`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {children}
        </div>
    )
}

function SectionHead({
    eyebrow,
    title,
    text,
    center = false,
}: {
    eyebrow: string
    title: ReactNode
    text?: string
    center?: boolean
}) {
    return (
        <div className={`section-head ${center ? "section-head--center" : ""}`}>
            <span className="eyebrow">{eyebrow}</span>
            <h2>{title}</h2>
            {text && <p>{text}</p>}
        </div>
    )
}

function QuoteForm({ compact = false }: { compact?: boolean }) {
    const uid = useId()
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [sent, setSent] = useState(false)
    const [sending, setSending] = useState(false)
    const [submitError, setSubmitError] = useState("")
    const submit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const data = new FormData(e.currentTarget)
        const next: Record<string, string> = {}
        if (!String(data.get("name") || "").trim())
            next.name = "Please enter your name."
        // Same check as EMAIL_RE in api/inquiry.ts.
        if (!/^[^\s@<>,;:"\\()[\]]+@[^\s@<>,;:"\\()[\]]+\.[^\s@<>,;:"\\()[\]]+$/.test(String(data.get("email") || "")))
            next.email = "Enter a valid email address."
        if (!String(data.get("phone") || "").trim())
            next.phone = "Please enter your phone number."
        setErrors(next)
        setSubmitError("")
        if (Object.keys(next).length) return
        setSending(true)
        try {
            const res = await fetch("/api/inquiry", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(Object.fromEntries(data)),
            })
            if (res.status === 429) {
                setSubmitError(
                    "You’ve sent several enquiries already. Please try again later, or call 07976 372870.",
                )
                return
            }
            if (!res.ok) throw new Error(String(res.status))
            setSent(true)
        } catch {
            setSubmitError(
                "Sorry, something went wrong. Please try again or email mike@ftserviceshayes.com.",
            )
        } finally {
            setSending(false)
        }
    }
    if (sent)
        return (
            <div
                className={`form-success ${compact ? "form-success--compact" : ""}`}
                role="status"
            >
                <span>
                    <Icon name="check" size={28} />
                </span>
                <h3>Thanks — we’ll be in touch.</h3>
                <p>
                    Your enquiry has been received. A member of our team will contact you
                    shortly.
                </p>
                <button className="text-link" onClick={() => setSent(false)}>
                    Send another enquiry
                </button>
            </div>
        )
    return (
        <form
            className={`quote-form ${compact ? "quote-form--compact" : ""}`}
            onSubmit={submit}
            noValidate
        >
            <div className="field">
                <label htmlFor={`${uid}-name`}>Name</label>
                <input
                    id={`${uid}-name`}
                    name="name"
                    placeholder="Your name"
                    aria-invalid={!!errors.name}
                />
                {errors.name && <span className="field__error">{errors.name}</span>}
            </div>
            <div className="field">
                <label htmlFor={`${uid}-email`}>Work email</label>
                <input
                    id={`${uid}-email`}
                    name="email"
                    type="email"
                    placeholder="you@company.co.uk"
                    aria-invalid={!!errors.email}
                />
                {errors.email && <span className="field__error">{errors.email}</span>}
            </div>
            <div className="field">
                <label htmlFor={`${uid}-phone`}>Phone</label>
                <input
                    id={`${uid}-phone`}
                    name="phone"
                    type="tel"
                    placeholder="Your phone number"
                    aria-invalid={!!errors.phone}
                />
                {errors.phone && <span className="field__error">{errors.phone}</span>}
            </div>
            {!compact && (
                <div className="field field--wide">
                    <label htmlFor={`${uid}-message`}>How can we help?</label>
                    <textarea
                        id={`${uid}-message`}
                        name="message"
                        rows={4}
                        placeholder="Tell us what you need"
                    />
                </div>
            )}
            {/* Honeypot: hidden from people and assistive tech; bots that fill it are ignored. */}
            <div className="form-honeypot" aria-hidden="true">
                <label htmlFor={`${uid}-website`}>Website</label>
                <input
                    id={`${uid}-website`}
                    name="website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                />
            </div>
            {submitError && (
                <span className="field__error" role="alert">
                    {submitError}
                </span>
            )}
            <button
                className="button button--primary form-submit"
                type="submit"
                disabled={sending}
            >
                {sending ? "Sending…" : "Request a free quote"} <Icon name="arrow" />
            </button>
            <p className="form-note">
                No pressure, no obligation. Just helpful advice.
            </p>
        </form>
    )
}

function Accordion({ items }: { items: { title: string; content: string }[] }) {
    const [open, setOpen] = useState(0)
    return (
        <div className="accordion">
            {items.map((item, index) => (
                <div
                    className={`accordion__item ${open === index ? "open" : ""}`}
                    key={item.title}
                >
                    <button
                        onClick={() => setOpen(open === index ? -1 : index)}
                        aria-expanded={open === index}
                    >
                        <span>{item.title}</span>
                        <Icon name="chevron" />
                    </button>
                    <div className="accordion__content">
                        <p>{item.content}</p>
                    </div>
                </div>
            ))}
        </div>
    )
}

const serviceCards = [
    {
        title: "New forklifts",
        text: "The right new equipment, carefully selected around your operation.",
        icon: "forklift" as IconName,
        path: "/new-forklifts",
        image: f20Image,
    },
    {
        title: "Used forklifts",
        text: "Quality used trucks for practical performance and dependable value.",
        icon: "truck" as IconName,
        path: "/used-forklifts",
        image: usedImage,
    },
    {
        title: "LiuGong forklifts",
        text: "A capable range of material handling equipment for modern sites.",
        icon: "forklift" as IconName,
        path: "/liugong-forklifts",
        image: dieselImage,
    },
    {
        title: "Hire & leasing",
        text: "Flexible options for short-term demand and long-term planning.",
        icon: "calendar" as IconName,
        path: "/forklift-hire",
        image: outdoorImage,
    },
    {
        title: "Servicing & repairs",
        text: "Responsive support that helps keep your operation moving.",
        icon: "tools" as IconName,
        path: "/forklift-services",
        image: lowAngleImage,
    },
]

function Home() {
    const trusts = [
        { icon: "award" as IconName, top: "CFTS", bottom: "Accredited" },
        { icon: "calendar" as IconName, top: "30+ years", bottom: "Experience" },
        { icon: "check" as IconName, top: "3-year warranty", bottom: "Truck parts & labour, all forklifts" },
        {
            icon: "shield" as IconName,
            top: "LiuGong Materials Handling",
            bottom: "Supply partner",
        },
        {
            icon: "location" as IconName,
            top: "Local coverage",
            bottom: "London & Home Counties",
        },
    ]
    return (
        <>
            <main>
                <section className="hero">
                    <img
                        src={heroImage}
                        alt="Forklift operating inside a modern warehouse"
                        fetchPriority="high"
                    />
                    <div className="hero__overlay" />
                    <div className="hero__content">
                        <span className="hero__eyebrow">
                            <i /> Independent forklift specialists in Hayes
                        </span>
                        <h1>
                            Local Forklift Sales,
                            <br />
                            Service & Hire <em>in London</em>
                        </h1>
                        <p>
                            Straight-talking advice, dependable equipment and responsive
                            support for businesses across London and the Home Counties.
                        </p>
                        <div className="hero__actions">
                            <Link
                                className="button button--primary button--large"
                                to="/contact"
                            >
                                Get a free quote <Icon name="arrow" />
                            </Link>
                            <a
                                className="button button--glass button--large"
                                href="tel:07976372870"
                            >
                                <Icon name="phone" /> Call us
                            </a>
                        </div>
                    </div>
                    <Link to="/contact" className="hero__note">
                        <span>
                            <Icon name="clock" />
                        </span>
                        <div>
                            <strong>Need help quickly?</strong>
                            <small>Call us for practical advice today</small>
                        </div>
                        <Icon name="arrow" size={18} />
                    </Link>
                </section>

                <section
                    className="trust-strip page-shell"
                    aria-label="Why customers trust FT Services"
                >
                    {trusts.map((item, i) => (
                        <Reveal key={item.top} delay={i * 60} className="trust-card">
                            <span>
                                <Icon name={item.icon} size={24} />
                            </span>
                            <div>
                                <strong>{item.top}</strong>
                                <small>{item.bottom}</small>
                            </div>
                        </Reveal>
                    ))}
                </section>

                <section className="section page-shell">
                    <Reveal>
                        <SectionHead
                            eyebrow="What we do"
                            title={
                                <>
                                    Everything your fleet needs, <span>under one roof.</span>
                                </>
                            }
                            text="From one forklift to a full fleet, we make finding, funding and maintaining the right equipment refreshingly straightforward."
                        />
                    </Reveal>
                    <div className="service-grid">
                        {serviceCards.map((card, i) => (
                            <Reveal key={card.title} delay={(i % 3) * 70}>
                                <Link to={card.path} className="service-card">
                                    <div className="service-card__image">
                                        <img src={card.image} alt="" loading="lazy" />
                                        <span>
                                            <Icon name={card.icon} size={22} />
                                        </span>
                                    </div>
                                    <div className="service-card__body">
                                        <h3>{card.title}</h3>
                                        <p>{card.text}</p>
                                        <span className="text-link">
                                            Explore service <Icon name="arrow" size={17} />
                                        </span>
                                    </div>
                                </Link>
                            </Reveal>
                        ))}
                    </div>
                </section>

                <section className="section section--soft">
                    <div className="page-shell split-intro">
                        <Reveal>
                            <SectionHead
                                eyebrow="Why FT Services"
                                title={
                                    <>
                                        Big-fleet expertise.
                                        <br />
                                        <span>Local service.</span>
                                    </>
                                }
                                text="We combine deep industry knowledge with the kind of personal, responsive support only an independent business can provide."
                            />
                        </Reveal>
                        <div className="benefit-grid">
                            {[
                                [
                                    "01",
                                    "Advice that fits",
                                    "We listen first, then recommend equipment and support around the way your business actually works.",
                                ],
                                [
                                    "02",
                                    "Here when needed",
                                    "Local coverage means responsive help and a team who understands your operation.",
                                ],
                                [
                                    "03",
                                    "One trusted team",
                                    "Sales, hire, leasing and servicing — coordinated by people you know.",
                                ],
                            ].map(([no, title, text], i) => (
                                <Reveal delay={i * 60} key={title} className="benefit-card">
                                    <span>{no}</span>
                                    <h3>{title}</h3>
                                    <p>{text}</p>
                                </Reveal>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="section page-shell finance">
                    <Reveal>
                        <SectionHead
                            center
                            eyebrow="Flexible finance"
                            title={
                                <>
                                    Choose a route that works <span>for your business.</span>
                                </>
                            }
                            text="Not sure which is right? We’ll explain your options clearly, without the jargon."
                        />
                    </Reveal>
                    <div className="finance-grid">
                        <Reveal className="finance-card">
                            <span className="finance-card__icon">
                                <Icon name="check" />
                            </span>
                            <div>
                                <span className="eyebrow">Own the asset</span>
                                <h3>Hire Purchase</h3>
                                <p>
                                    Spread the cost over time, with a clear path to owning the
                                    truck at the end of the agreement.
                                </p>
                                <ul>
                                    <li>
                                        <Icon name="check" /> Build an asset for your business
                                    </li>
                                    <li>
                                        <Icon name="check" /> Predictable monthly payments
                                    </li>
                                    <li>
                                        <Icon name="check" /> Suited to long-term use
                                    </li>
                                </ul>
                            </div>
                        </Reveal>
                        <Reveal delay={80} className="finance-card finance-card--dark">
                            <span className="finance-card__icon">
                                <Icon name="calendar" />
                            </span>
                            <div>
                                <span className="eyebrow">Keep things flexible</span>
                                <h3>Lease</h3>
                                <p>
                                    Access the equipment you need while preserving capital and
                                    keeping your fleet options open.
                                </p>
                                <ul>
                                    <li>
                                        <Icon name="check" /> Lower upfront commitment
                                    </li>
                                    <li>
                                        <Icon name="check" /> Easier fleet planning
                                    </li>
                                    <li>
                                        <Icon name="check" /> Flexible end-of-term options
                                    </li>
                                </ul>
                            </div>
                        </Reveal>
                    </div>
                </section>

                <section className="section page-shell areas">
                    <Reveal className="areas__panel">
                        <div>
                            <SectionHead
                                eyebrow="On your doorstep"
                                title={
                                    <>
                                        Covering London &<br />
                                        <span>the Home Counties.</span>
                                    </>
                                }
                                text="Based in Hayes, we support businesses across West London and the surrounding areas."
                            />
                            <Link to="/contact" className="text-link">
                                Check your area <Icon name="arrow" />
                            </Link>
                        </div>
                        <div className="areas__map">
                            <div className="map-ring ring-1" />
                            <div className="map-ring ring-2" />
                            <span className="map-pin">
                                <Icon name="location" size={26} />
                            </span>
                            {[
                                "Hayes",
                                "Wembley",
                                "Slough",
                                "Uxbridge",
                                "Heathrow",
                                "Watford",
                                "Ealing",
                                "Hounslow",
                            ].map((area, i) => (
                                <span className={`area-tag tag-${i + 1}`} key={area}>
                                    {area}
                                </span>
                            ))}
                        </div>
                    </Reveal>
                </section>

                <ContactBand />
            </main>
        </>
    )
}

function ContactBand() {
    return (
        <section className="contact-band">
            <div className="page-shell contact-band__inner">
                <div className="contact-band__copy">
                    <span className="eyebrow eyebrow--light">Let's talk forklifts</span>
                    <h2>Free, no-hassle quotes.</h2>
                    <p>
                        Tell us what you need. We’ll come back with practical advice and a
                        clear quote — no pressure, no obligation.
                    </p>
                    <div className="contact-band__direct">
                        <span>
                            <Icon name="phone" />
                        </span>
                        <div>
                            <small>Prefer to call?</small>
                            <a href="tel:07976372870">07976 372870</a>
                        </div>
                    </div>
                </div>
                <div className="contact-band__form">
                    <QuoteForm />
                </div>
            </div>
        </section>
    )
}

const pageData: Record<string, {
    eyebrow: string
    title: string
    summary: string
    intro: string
    chips: string[]
    image: string
}> = {
    "/new-forklifts": {
        eyebrow: "New equipment",
        title: "New forklifts, matched to your operation.",
        summary:
            "Practical guidance and a strong range of material handling equipment for businesses across London.",
        intro:
            "Choosing a new forklift is about more than capacity. We help you consider the environment, workload, access, lift heights and running costs so your next truck is right for the job.",
        chips: [
            "Counterbalance Trucks",
            "Reach Trucks",
            "Pallet Trucks",
            "Pallet Pickers",
            "Narrow Aisle",
            "Stackers",
            "Diesel",
            "Electric",
        ],
        image: f20Image,
    },
    "/used-forklifts": {
        eyebrow: "Quality used equipment",
        title: "Dependable used forklifts. Sensible value.",
        summary:
            "Find the right used truck for your workload, budget and site — with straightforward local support.",
        intro:
            "A well-chosen used forklift can be a practical way to add capacity or replace ageing equipment. We focus on matching the truck to the work, not simply making a sale.",
        chips: [
            "Counterbalance Trucks",
            "Reach Trucks",
            "Pallet Trucks",
            "Warehouse Trucks",
            "Diesel",
            "Electric",
            "LPG",
            "Short-term Needs",
        ],
        image: usedImage,
    },
    "/forklift-services": {
        eyebrow: "Service & support",
        title: "Keep your forklifts working at their best.",
        summary:
            "Responsive servicing, repairs and support from an experienced independent team based in Hayes.",
        intro:
            "Downtime disrupts your whole operation. Our practical approach helps identify issues early, keep equipment working safely and give you a clearer view of ongoing fleet needs.",
        chips: [
            "Routine Servicing",
            "Forklift Repairs",
            "Thorough Examinations",
            "Fleet Support",
            "Parts & Advice",
        ],
        image: lowAngleImage,
    },
    "/diesel-forklifts": {
        eyebrow: "Diesel forklifts",
        title: "Diesel forklifts for demanding work.",
        summary:
            "Explore robust material handling options for outdoor sites and hard-working applications.",
        intro:
            "Diesel forklifts can be a practical fit for demanding outdoor work. We help you assess capacity, site conditions, lift requirements and daily use before choosing equipment.",
        chips: [
            "Counterbalance Trucks",
            "Outdoor Operations",
            "Material Handling",
            "New Equipment",
            "Used Equipment",
            "Hire Options",
        ],
        image: dieselImage2,
    },
    "/electric-forklifts": {
        eyebrow: "Electric forklifts",
        title: "Clean, capable electric forklifts.",
        summary:
            "Practical electric equipment for warehouses, indoor operations and modern material handling.",
        intro:
            "Electric forklifts can offer quiet, responsive operation for a wide range of sites. We help you consider workload, charging arrangements, access and lift requirements.",
        chips: [
            "Counterbalance Trucks",
            "Reach Trucks",
            "Pallet Trucks",
            "Narrow Aisle",
            "Stackers",
            "Warehouse Equipment",
        ],
        image: outdoorImage,
    },
}

function PageHero({
    data,
    badge,
    quoteTargetId,
}: {
    data: typeof pageData[string]
    badge?: string
    quoteTargetId?: string
}) {
    return (
        <section className="inner-hero page-shell">
            <div className="inner-hero__copy">
                <span className="eyebrow">{data.eyebrow}</span>
                {badge && <span className="price-badge">{badge}</span>}
                <h1>{data.title}</h1>
                <p>{data.summary}</p>
                <div className="inner-hero__actions">
                    {quoteTargetId ? (
                        <a
                            className="button button--primary button--large"
                            href={`#${quoteTargetId}`}
                            onClick={(event) => {
                                event.preventDefault()
                                document
                                    .getElementById(quoteTargetId)
                                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                            }}
                        >
                            Get a free quote <Icon name="arrow" />
                        </a>
                    ) : (
                        <Link className="button button--primary button--large" to="/contact">
                            Get a free quote <Icon name="arrow" />
                        </Link>
                    )}
                    <a
                        className="button button--ghost button--large"
                        href="tel:07976372870"
                    >
                        <Icon name="phone" /> Call us
                    </a>
                </div>
            </div>
            <div className="inner-hero__image">
                <img
                    src={data.image}
                    alt="Forklift equipment in an industrial setting"
                />
                <span>
                    <Icon name="location" /> Local support from Hayes
                </span>
            </div>
        </section>
    )
}

function NotFoundPage() {
    useEffect(() => {
        const previous = document.title
        document.title = "Page not found | FT Services"
        return () => {
            document.title = previous
        }
    }, [])
    return (
        <main>
            <section className="inner-hero page-shell not-found">
                <div className="inner-hero__copy">
                    <span className="eyebrow">404</span>
                    <h1>Page not found</h1>
                    <p>
                        Sorry, we couldn’t find the page you were looking for. It may have
                        moved, or the address may be mistyped.
                    </p>
                    <div className="inner-hero__actions">
                        <Link className="button button--primary button--large" to="/">
                            Back to home <Icon name="arrow" />
                        </Link>
                        <Link className="button button--ghost button--large" to="/contact">
                            Contact us
                        </Link>
                    </div>
                </div>
            </section>
        </main>
    )
}

function StickyQuote() {
    return (
        <aside className="sticky-quote">
            <div className="sticky-quote__head">
                <span>
                    <Icon name="arrow" />
                </span>
                <div>
                    <small>Need some advice?</small>
                    <h3>Get a free quote</h3>
                </div>
            </div>
            <QuoteForm compact />
            <div className="sticky-quote__phone">
                <span>
                    <Icon name="phone" />
                </span>
                <div>
                    <small>Or call us direct</small>
                    <a href="tel:07976372870">07976 372870</a>
                </div>
            </div>
        </aside>
    )
}

const warranties = [
    {
        value: "3 years",
        title: "Truck parts & labour",
        text: "Warranty on all forklifts.",
    },
    {
        value: "2 years",
        title: "Lithium-ion battery charger",
        text: "Battery charger warranty.",
    },
    {
        value: "5 years or 10,000 hours",
        title: "Lithium-ion battery",
        text: "Lithium-ion battery warranty.",
    },
]

function WarrantyBlock() {
    return (
        <Reveal>
            <div className="warranty-block">
                <span className="eyebrow">Peace of mind</span>
                <h3>Warranty you can count on</h3>
                <ul className="warranty-grid">
                    {warranties.map((w) => (
                        <li key={w.value}>
                            <strong>{w.value}</strong>
                            <span>{w.title}</span>
                            <small>{w.text}</small>
                        </li>
                    ))}
                </ul>
            </div>
        </Reveal>
    )
}

function StandardInnerPage({
    data,
    showWarranty = false,
}: {
    data: typeof pageData[string]
    showWarranty?: boolean
}) {
    const copyItems = [
        {
            title: "How we help you choose",
            content:
                "We take time to understand your site, loads, operating hours and working environment. That gives you a more useful recommendation and helps avoid paying for capacity or features you do not need.",
        },
        {
            title: "A practical, local service",
            content:
                "Based in Hayes, we support businesses throughout London and the Home Counties. You deal with an experienced team who can help with equipment, funding, servicing and ongoing fleet support.",
        },
        {
            title: "Support beyond the sale",
            content:
                "Our relationship does not end when equipment arrives. We can help with servicing, repairs and future fleet planning, keeping everything simple and joined up.",
        },
    ]
    return (
        <main>
            <PageHero data={data} />
            <section className="section page-shell inner-layout">
                <div className="inner-content">
                    <Reveal>
                        <span className="eyebrow">The right truck for the work</span>
                        <h2>
                            Straightforward advice.
                            <br />
                            <span>Better equipment decisions.</span>
                        </h2>
                        <p className="lead">{data.intro}</p>
                    </Reveal>
                    <Reveal>
                        <div className="chip-grid">
                            {data.chips.map((chip) =>
                                chip === "Diesel" || chip === "Electric" ? (
                                    <Link
                                        key={chip}
                                        to={`/${chip.toLowerCase()}-forklifts`}
                                        className="chip-link"
                                    >
                                        <Icon name="arrow" size={16} />
                                        {chip} forklifts
                                    </Link>
                                ) : (
                                    <span key={chip}>
                                        <Icon name="check" size={16} />
                                        {chip}
                                    </span>
                                ),
                            )}
                        </div>
                    </Reveal>
                    <Reveal>
                        <div className="content-block">
                            <h3>Equipment that fits the job</h3>
                            <p>
                                Every operation is different. Floor conditions, aisle widths,
                                load centres, shift patterns and charging or fuel arrangements
                                can all affect what works best. We help make those choices
                                easier to understand.
                            </p>
                            <p>
                                Whether you need one truck or are reviewing a wider fleet, the
                                starting point is always the same: what will deliver reliable
                                performance for your business?
                            </p>
                        </div>
                    </Reveal>
                    {showWarranty && <WarrantyBlock />}
                    <Reveal>
                        <Accordion items={copyItems} />
                    </Reveal>
                </div>
                <StickyQuote />
            </section>
            <ContactBand />
            <MobileQuote />
        </main>
    )
}

function HirePage() {
    const data = {
        eyebrow: "Flexible forklift hire",
        title: "The equipment you need, for as long as you need it.",
        summary:
            "Short and long-term forklift hire for planned demand, urgent cover and growing operations.",
        intro:
            "Hiring can give your operation room to adapt without tying up capital. We help you find a practical hire arrangement based on workload, timescale and site requirements.",
        chips: [
            "Short-term Hire",
            "Long-term Hire",
            "Hire & Leasing",
            "Counterbalance",
            "Warehouse Trucks",
            "Fleet Cover",
        ],
        image: outdoorImage,
    }
    return (
        <main>
            <PageHero data={data} badge="Starting at £85/week on 5 year hire" />
            <section className="section page-shell inner-layout">
                <div className="inner-content">
                    <Reveal>
                        <SectionHead
                            eyebrow="Built around your operation"
                            title={
                                <>
                                    Flexible hire, without <span>the guesswork.</span>
                                </>
                            }
                            text={data.intro}
                        />
                    </Reveal>
                    <Reveal>
                        <div className="chip-grid">
                            {data.chips.map((chip) => (
                                <span key={chip}>
                                    <Icon name="check" size={16} />
                                    {chip}
                                </span>
                            ))}
                        </div>
                    </Reveal>
                    <div className="process-grid">
                        {[
                            "Tell us what you need",
                            "We match the equipment",
                            "Your hire gets moving",
                        ].map((title, i) => (
                            <Reveal className="process-card" delay={i * 60} key={title}>
                                <span>0{i + 1}</span>
                                <h3>{title}</h3>
                                <p>
                                    {
                                        [
                                            "Share your loads, site and timescale with our team.",
                                            "We recommend a practical fit for the work and budget.",
                                            "Clear arrangements and local support from our Hayes team.",
                                        ][i]
                                    }
                                </p>
                            </Reveal>
                        ))}
                    </div>
                    <Reveal>
                        <Accordion
                            items={[
                                {
                                    title: "Short-term or long-term?",
                                    content:
                                        "The right term depends on whether you are covering a temporary peak, testing a new requirement or planning core fleet capacity. We can help you compare the options.",
                                },
                                {
                                    title: "What information do you need?",
                                    content:
                                        "Useful details include load weight, lift height, site environment, aisle widths and likely operating hours. If you are unsure, talk us through the work and we will help.",
                                },
                                {
                                    title: "Can you help with several trucks?",
                                    content:
                                        "Yes. We can discuss individual trucks or broader fleet requirements and help coordinate the equipment and support around your operation.",
                                },
                            ]}
                        />
                    </Reveal>
                </div>
                <StickyQuote />
            </section>
            <ContactBand />
            <MobileQuote />
        </main>
    )
}

function LiuGongPage() {
    const data = {
        eyebrow: "LiuGong forklifts",
        title: "Capable trucks. Straightforward local support.",
        summary:
            "Explore the LiuGong range with practical advice from an experienced independent forklift team.",
        intro:
            "We help you assess the LiuGong range against your loads, lift requirements and working environment, making it easier to narrow down the right model.",
        chips: [
            "Electric Forklifts",
            "Diesel Forklifts",
            "Warehouse Equipment",
            "Material Handling",
        ],
        image: heroImage,
    }
    return (
        <main>
            <PageHero data={data} />
            <section className="section page-shell inner-layout">
                <div className="inner-content">
                    <Reveal>
                        <SectionHead
                            eyebrow="Explore the range"
                            title={
                                <>
                                    Find a model that fits <span>the work.</span>
                                </>
                            }
                            text={data.intro}
                        />
                    </Reveal>
                    <Reveal>
                        <div className="news-callout">
                            <span className="news-callout__icon">
                                <Icon name="award" size={22} />
                            </span>
                            <div>
                                <strong>Lithium-ion battery tech just got even better.</strong>
                                <p>
                                    LiuGong lithium-ion batteries are now backed by a 2-year and
                                    10,000-hour warranty. Ask us what the latest battery technology
                                    could mean for your operation.
                                </p>
                            </div>
                        </div>
                    </Reveal>
                    <WarrantyBlock />
                    <Reveal>
                        <div
                            className="spec-table-wrap"
                            role="region"
                            aria-label="LiuGong model specifications"
                            tabIndex={0}
                        >
                            <table className="spec-table">
                                <thead>
                                    <tr>
                                        <th>Model</th>
                                        <th>Capacity</th>
                                        <th>Free lift height</th>
                                        <th>Fork size</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        [
                                            "Model options",
                                            "Ask our team",
                                            "Model dependent",
                                            "Model dependent",
                                        ],
                                        [
                                            "Electric range",
                                            "Ask our team",
                                            "Model dependent",
                                            "Model dependent",
                                        ],
                                        [
                                            "Diesel range",
                                            "Ask our team",
                                            "Model dependent",
                                            "Model dependent",
                                        ],
                                    ].map((row) => (
                                        <tr key={row[0]}>
                                            {row.map((cell) => (
                                                <td key={cell}>{cell}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <p className="table-note">
                            Specifications vary by model and configuration. Contact us for
                            current product details.
                        </p>
                    </Reveal>
                    <div className="process-grid">
                        {[
                            "Share your requirements",
                            "Compare the options",
                            "Plan delivery & support",
                        ].map((title, i) => (
                            <Reveal className="process-card" delay={i * 60} key={title}>
                                <span>0{i + 1}</span>
                                <h3>{title}</h3>
                                <p>
                                    {
                                        [
                                            "Tell us about the loads, site and daily work.",
                                            "We help you assess suitable models and configurations.",
                                            "We coordinate next steps and ongoing local support.",
                                        ][i]
                                    }
                                </p>
                            </Reveal>
                        ))}
                    </div>
                    <Reveal>
                        <SectionHead
                            eyebrow="Common questions"
                            title={
                                <>
                                    LiuGong forklift <span>FAQs.</span>
                                </>
                            }
                        />
                    </Reveal>
                    <Reveal>
                        <Accordion
                            items={[
                                {
                                    title: "Which LiuGong model is right for me?",
                                    content:
                                        "That depends on load capacity, lift height, working environment and daily use. Speak to our team and we will help narrow down the suitable options.",
                                },
                                {
                                    title: "Can you help with finance?",
                                    content:
                                        "We can discuss different routes including hire purchase and leasing, helping you understand which structure may suit your business.",
                                },
                                {
                                    title: "Do you provide ongoing support?",
                                    content:
                                        "Yes. FT Services provides local servicing and support from our base in Hayes for customers across London and the Home Counties.",
                                },
                            ]}
                        />
                    </Reveal>
                </div>
                <StickyQuote />
            </section>
            <ContactBand />
            <MobileQuote />
        </main>
    )
}

const businessLocation: [number, number] = [51.5066, -0.4333]
const markerPin = L.icon({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
})

function LocationMap() {
    return (
        <section className="section page-shell location-map">
            <div className="location-map__head">
                <span className="eyebrow">Find us</span>
                <h2>
                    Visit our <span>Hayes base.</span>
                </h2>
            </div>
            <MapContainer
                center={businessLocation}
                zoom={15}
                scrollWheelZoom={false}
                className="location-map__canvas"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={businessLocation} icon={markerPin}>
                    <Popup>
                        <strong>FT Services</strong>
                        <br />
                        Unit 24 Adler Industrial Estate
                        <br />
                        Betam Road, Hayes, UB3 1ST
                    </Popup>
                </Marker>
            </MapContainer>
        </section>
    )
}

function ContactPage() {
    const data = {
        eyebrow: "Contact FT Services",
        title: "Let’s get your operation moving.",
        summary:
            "Tell us what you need and our Hayes-based team will come back with practical advice and a clear next step.",
        intro: "",
        chips: [],
        image: clampImage,
    }
    return (
        <main>
            <PageHero data={data} quoteTargetId="contact-form" />
            <section className="section page-shell contact-page">
                <div className="contact-page__details">
                    <SectionHead
                        eyebrow="Speak to our team"
                        title={
                            <>
                                Local people.
                                <br />
                                <span>Helpful answers.</span>
                            </>
                        }
                        text="Call, email or send an enquiry. We’ll help with sales, hire, servicing and general forklift advice."
                    />
                    <div className="contact-list">
                        <a href="tel:07976372870">
                            <span>
                                <Icon name="phone" />
                            </span>
                            <div>
                                <strong>07976 372870</strong>
                            </div>
                        </a>
                        <a href="mailto:mike@ftserviceshayes.com">
                            <span>
                                <Icon name="mail" />
                            </span>
                            <div>
                                <strong>mike@ftserviceshayes.com</strong>
                            </div>
                        </a>
                        <div>
                            <span>
                                <Icon name="location" />
                            </span>
                            <div>
                                <small>Visit us</small>
                                <strong>
                                    Unit 24 Adler Industrial Estate
                                    <br />
                                    Betam Road, Hayes, UB3 1ST
                                </strong>
                            </div>
                        </div>
                        <div>
                            <span>
                                <Icon name="clock" />
                            </span>
                            <div>
                                <small>Opening hours</small>
                                <strong>8am–5pm</strong>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="contact-page__form" id="contact-form">
                    <span className="eyebrow">Request a callback</span>
                    <h2>How can we help?</h2>
                    <QuoteForm />
                </div>
            </section>
            <LocationMap />
        </main>
    )
}

function MobileQuote() {
    return (
        <Link to="/contact" className="mobile-quote">
            <Icon name="arrow" /> Get a quote
        </Link>
    )
}

function Footer() {
    return (
        <footer className="footer">
            <div className="page-shell">
                <div className="footer__top">
                    <div className="footer__brand">
                        <Logo light />
                        <p>
                            Independent forklift sales, hire, leasing and servicing across
                            London and the Home Counties.
                        </p>
                        <span className="cfts">
                            <Icon name="award" />
                            <strong>CFTS</strong> Accredited
                        </span>
                    </div>
                    <div>
                        <h4>Services</h4>
                        <Link to="/new-forklifts">New forklifts</Link>
                        <Link to="/used-forklifts">Used forklifts</Link>
                        <Link to="/liugong-forklifts">LiuGong forklifts</Link>
                        <Link to="/forklift-hire">Hire & leasing</Link>
                        <Link to="/forklift-services">Servicing & repairs</Link>
                    </div>
                    <div>
                        <h4>Company</h4>
                        <Link to="/">Home</Link>
                        <Link to="/contact">Contact</Link>
                        <a href="tel:07976372870">07976 372870</a>
                        <a href="mailto:mike@ftserviceshayes.com">Email our team</a>
                    </div>
                    <div>
                        <h4>Find us</h4>
                        <p>
                            Unit 24 Adler Industrial Estate
                            <br />
                            Betam Road, Hayes
                            <br />
                            Middlesex UB3 1ST
                        </p>
                        <p>
                            <strong>Open Monday–Friday</strong>
                            <br />
                            8am–5pm
                        </p>
                    </div>
                </div>
                <div className="footer__bottom">
                    <span>
                        © {new Date().getFullYear()} FT Services. All rights reserved.
                    </span>
                    <span>Company registration details available on request.</span>
                </div>
            </div>
        </footer>
    )
}

// Old URLs that moved. Vercel redirects these server-side (vercel.json); this covers
// client-side and local dev.
const movedPaths: Record<string, string> = {
    "/luigong-forklifts": "/liugong-forklifts",
}

function currentPath() {
    const path = window.location.pathname
    const moved = movedPaths[path]
    if (moved) {
        window.history.replaceState(null, "", moved + window.location.search + window.location.hash)
        return moved
    }
    return path
}

export default function App() {
    const [path, setPath] = useState(currentPath)
    useEffect(() => {
        const update = () => {
            setPath(currentPath())
            window.scrollTo({ top: 0, behavior: "instant" })
        }
        window.addEventListener("popstate", update)
        return () => window.removeEventListener("popstate", update)
    }, [])

    let page: ReactNode
    if (path === "/") page = <Home />
    else if (path === "/liugong-forklifts") page = <LiuGongPage />
    else if (path === "/forklift-hire") page = <HirePage />
    else if (path === "/contact") page = <ContactPage />
    else if (pageData[path])
        page = (
            <StandardInnerPage
                data={pageData[path]}
                showWarranty={path === "/new-forklifts"}
            />
        )
    else page = <NotFoundPage />

    return (
        <>
            <Header path={path} />
            {page}
            <Footer />
        </>
    )
}
