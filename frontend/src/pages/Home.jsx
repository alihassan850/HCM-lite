
    import React from 'react';
    import { Link } from 'react-router-dom';

    const features = [
    {
        icon: '👥',
        title: 'Employee Management',
        description:
        'Keep employee profiles, departments, and workforce information organized in one place.',
    },
    {
        icon: '⏱️',
        title: 'Attendance Tracking',
        description:
        'Monitor attendance and working hours through a clear, centralized interface.',
    },
    {
        icon: '📅',
        title: 'Leave Management',
        description:
        'Simplify leave requests, approvals, and employee leave records.',
    },
    {
        icon: '💰',
        title: 'Payroll Management',
        description:
        'Organize payroll workflows and employee compensation information.',
    },
    {
        icon: '📊',
        title: 'HR Analytics',
        description:
        'Make workforce information easier to review with organized HR records.',
    },
    {
        icon: '🔐',
        title: 'Role-Based Access',
        description:
        'Give administrators, HR teams, and employees access to their relevant tools.',
    },
    ];

    export default function Home() {
    return (
        <main className="min-h-screen overflow-hidden bg-slate-50 text-slate-800">
        {/* Navigation */}
        <header className="border-b border-slate-200 bg-white">
            <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
            <Link to="/" className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-600 text-xl font-extrabold text-white">
                H
                </span>
                <span>
                <span className="block text-xl font-bold text-slate-900">
                    HCM Lite
                </span>
                <span className="text-xs text-slate-500">
                    Human Capital Management
                </span>
                </span>
            </Link>

            <div className="hidden items-center gap-7 md:flex">
                <a href="#features" className="text-sm text-slate-600 hover:text-teal-600">
                Features
                </a>
                <a href="#about" className="text-sm text-slate-600 hover:text-teal-600">
                About
                </a>
                <a href="#contact" className="text-sm text-slate-600 hover:text-teal-600">
                Contact
                </a>
            </div>

            <div className="flex items-center gap-3">
                <Link
                to="/login"
                className="rounded-lg px-3 py-2 font-semibold text-slate-700 hover:text-teal-600"
                >
                Login
                </Link>
                <Link
                to="/first-run"
                className="rounded-lg bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700"
                >
                Get Started
                </Link>
            </div>
            </nav>
        </header>

        {/* Hero */}
        <section className="bg-gradient-to-br from-slate-50 via-white to-cyan-50">
            <div className="mx-auto grid max-w-7xl items-center gap-14 px-6 py-20 lg:grid-cols-2 lg:py-28">
            <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-teal-100 bg-white px-4 py-2 text-sm font-medium text-teal-700">
                <span className="h-2 w-2 rounded-full bg-cyan-500" />
                Smarter people management
                </span>

                <h1 className="mt-7 text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                Your people.
                <br />
                Your workplace.
                <br />
                <span className="text-teal-600">One simple platform.</span>
                </h1>

                <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
                Manage employees, attendance, leave requests, payroll workflows,
                and everyday HR operations with HCM Lite.
                </p>

                <div className="mt-9 flex flex-wrap gap-4">
                <Link
                    to="/login"
                    className="rounded-xl bg-teal-600 px-7 py-4 font-semibold text-white shadow-lg shadow-teal-600/20 transition hover:-translate-y-0.5 hover:bg-teal-700"
                >
                    Access Your Workspace →
                </Link>
                <a
                    href="#features"
                    className="rounded-xl border border-slate-200 bg-white px-7 py-4 font-semibold text-slate-700 hover:border-teal-300"
                >
                    Explore Features
                </a>
                </div>

                <div className="mt-8 flex flex-wrap gap-5 text-sm text-slate-500">
                <span>✓ Centralized HR</span>
                <span>✓ Role-based access</span>
                <span>✓ Simple workflows</span>
                </div>
            </div>

            {/* Dashboard preview */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-900/10 sm:p-8">
                <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                <div>
                    <p className="text-sm text-slate-500">Welcome to</p>
                    <h2 className="mt-1 text-2xl font-bold text-slate-900">
                    HCM Dashboard
                    </h2>
                </div>
                <span className="rounded-xl bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-700">
                    Overview
                </span>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">
                {[
                    { label: 'Employees', value: 'People', icon: '👥', color: 'bg-teal-50' },
                    { label: 'Attendance', value: 'Daily', icon: '⏱️', color: 'bg-cyan-50' },
                    { label: 'Leave Requests', value: 'Review', icon: '📅', color: 'bg-slate-100' },
                    { label: 'Payroll', value: 'Manage', icon: '💰', color: 'bg-teal-50' },
                ].map((item) => (
                    <div key={item.label} className={`rounded-2xl ${item.color} p-5`}>
                    <span className="text-2xl">{item.icon}</span>
                    <p className="mt-4 text-sm text-slate-600">{item.label}</p>
                    <p className="mt-1 text-xl font-bold text-slate-900">{item.value}</p>
                    </div>
                ))}
                </div>

                <div className="mt-5 rounded-2xl border border-slate-100 p-5">
                <h3 className="font-semibold text-slate-800">
                    Everything in one place
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                    Employee records, HR administration, and workforce workflows
                    in one convenient workspace.
                </p>
                <div className="mt-4 flex gap-2">
                    <span className="h-2 flex-1 rounded-full bg-teal-500" />
                    <span className="h-2 flex-1 rounded-full bg-teal-300" />
                    <span className="h-2 flex-1 rounded-full bg-cyan-200" />
                    <span className="h-2 flex-1 rounded-full bg-slate-100" />
                </div>
                </div>
                <p className="mt-4 text-xs text-slate-400">
                Feature preview — not live employee data.
                </p>
            </div>
            </div>
        </section>

        {/* Features */}
        <section id="features" className="px-6 py-20 lg:py-24">
            <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-2xl text-center">
                <p className="text-sm font-bold uppercase tracking-widest text-teal-600">
                What HCM Lite offers
                </p>
                <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Essential HR tools, all together
                </h2>
                <p className="mt-4 leading-7 text-slate-600">
                Make daily HR tasks more organized with a unified workforce
                management platform.
                </p>
            </div>

            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {features.map((feature) => (
                <article
                    key={feature.title}
                    className="rounded-2xl border border-slate-200 p-7 transition hover:-translate-y-1 hover:border-teal-200 hover:shadow-xl hover:shadow-slate-900/5"
                >
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-2xl">
                    {feature.icon}
                    </div>
                    <h3 className="mt-6 text-xl font-bold text-slate-900">
                    {feature.title}
                    </h3>
                    <p className="mt-3 leading-7 text-slate-600">
                    {feature.description}
                    </p>
                </article>
                ))}
            </div>
            </div>
        </section>

        {/* About */}
        <section id="about" className="bg-slate-50 px-6 py-20">
            <div className="mx-auto grid max-w-7xl items-center gap-8 md:grid-cols-2">
            <h2 className="text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
                Less administrative complexity.
                <br />
                Better people management.
            </h2>
            <p className="text-lg leading-8 text-slate-600">
                HCM Lite brings your HR workflows into a central workspace.
                Administrators, HR professionals, and employees can use the tools
                relevant to their roles.
            </p>
            </div>
        </section>

        {/* Call to action */}
        <section id="contact" className="px-6 py-20">
            <div className="mx-auto max-w-5xl rounded-3xl bg-teal-700 px-7 py-14 text-center text-white sm:px-14">
            <h2 className="text-3xl font-bold sm:text-4xl">
                Make HR simpler with HCM Lite
            </h2>
            <p className="mx-auto mt-4 max-w-2xl leading-7 text-teal-100">
                Sign in to access your workspace and manage your HR responsibilities.
            </p>
            <Link
                to="/login"
                className="mt-8 inline-flex rounded-xl bg-white px-7 py-4 font-semibold text-teal-700 transition hover:bg-teal-50"
            >
                Login to HCM Lite →
            </Link>
            </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-slate-100 px-6 py-8">
            <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <Link to="/" className="text-lg font-bold text-slate-900">
                HCM Lite
            </Link>
            <p className="text-sm text-slate-500">
                Human Capital Management
            </p>
            <Link to="/login" className="text-sm text-slate-500 hover:text-teal-600">
                Login
            </Link>
            </div>
        </footer>
        </main>
    );
    }
