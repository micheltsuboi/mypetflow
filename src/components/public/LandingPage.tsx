import Image from 'next/image'
import Link from 'next/link'
import styles from './LandingPage.module.css'
import { fetchPlans } from '@/app/actions/plans'
import { Droplet, Home, Calendar, Store, PieChart } from 'lucide-react'

export default async function LandingPage() {
    // Busca os planos do banco de dados e filtra apenas os ativos
    const plansData = await fetchPlans()
    const activePlans = plansData.filter(p => p.is_active).sort((a, b) => a.price - b.price)

    return (
        <main className={styles.main}>
            {/* Top Banner */}
            <div className={styles.topBanner}>
                <span>Já possui uma conta MyPetFlow?</span>
                <Link href="/login" className={styles.topBannerLink}>Acessar meu Pet Shop &rarr;</Link>
            </div>

            {/* Navbar */}
            <header className={styles.header}>
                <div className={styles.container}>
                    <div className={styles.navInner}>
                        <div className={styles.logo}>
                            <Image src="/LOGO-02.png" alt="MyPet Flow" width={180} height={50} className={styles.logoImage} priority />
                        </div>
                        <nav className={styles.desktopNav}>
                            <Link href="#modulos">Módulos</Link>
                            <Link href="#diferenciais">Diferenciais</Link>
                            <Link href="#planos">Planos</Link>
                        </nav>
                        <div className={styles.authButtons}>
                            <Link href="/cadastro" className={styles.loginBtn}>Entrar (Tutor)</Link>
                            <Link href="/cadastro-empresa" className={styles.signupBtn}>Cadastrar Empresa</Link>
                        </div>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className={styles.heroSection}>
                <div className={styles.container}>
                    <div className={styles.heroGrid}>
                        <div className={styles.heroContent}>
                            <h1 className={styles.heroTitle}>A Plataforma Definitiva para Gestão do seu Pet Shop</h1>
                            <p className={styles.heroSubtitle}>
                                Automatize mensagens pelo WhatsApp, controle financeiro, agenda, banho e tosa, creche e hospedagem em um único sistema feito para o sucesso do seu negócio.
                            </p>
                            <div className={styles.heroActions}>
                                <Link href="/cadastro-empresa" className={styles.primaryBtn}>Testar Grátis Agora</Link>
                                <Link href="#modulos" className={styles.secondaryBtn}>
                                    <span className={styles.playIcon}>▶</span> Ver Demo
                                </Link>
                            </div>
                        </div>

                        {/* Decorative Graphic Based on Ref */}
                        <div className={styles.heroGraphics}>
                            <div className={styles.shapeCoral}>
                                <img src="/hero-dog-bath.jpg" alt="Border Collie Bath" className={styles.petImage1} />
                            </div>
                            <div className={styles.shapeSky}>
                                <img src="https://images.unsplash.com/photo-1510771463146-e89e6e86560e?q=80&w=400&auto=format&fit=crop" alt="Dog on Laptop" className={styles.petImage2} />
                            </div>
                            <div className={styles.floatingCard}>
                                <div className={styles.avatarGroup}>
                                    <span style={{ fontSize: '1.5rem' }}>👩🏼‍⚕️</span>
                                    <span style={{ fontSize: '1.5rem' }}>🧑🏻‍💼</span>
                                </div>
                                <div className={styles.floatingText}>
                                    <strong>+500</strong><br />
                                    <span>Clientes Felizes</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Modules Section */}
            <section id="modulos" className={styles.modulesSection}>
                <div className={styles.container}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>Tudo o que você precisa em um só lugar</h2>
                        <p className={styles.sectionSubtitle}>Módulos completos e integrados para a gestão total do seu negócio Pet.</p>
                    </div>

                    <div className={styles.modulesGrid}>
                        {/* Module Card 1 */}
                        <div className={styles.moduleCard}>
                            <div className={`${styles.moduleShape} ${styles.bgCoral}`}>
                                <div className={styles.moduleIcon}><Droplet size={48} strokeWidth={1.5} color="var(--color-coral)" /></div>
                            </div>
                            <div className={styles.moduleInfo}>
                                <h3>Banho e Tosa</h3>
                                <p>Agendamento fácil, pacotes mensais, checklist de serviços e comissionamento.</p>
                            </div>
                        </div>

                        {/* Module Card 2 */}
                        <div className={styles.moduleCard}>
                            <div className={`${styles.moduleShape} ${styles.bgSky}`}>
                                <div className={styles.moduleIcon}><Home size={48} strokeWidth={1.5} color="var(--color-sky)" /></div>
                            </div>
                            <div className={styles.moduleInfo}>
                                <h3>Creche & Hospedagem</h3>
                                <p>Controle de check-in, check-out, avaliação comportamental e histórico completo do Pet.</p>
                            </div>
                        </div>

                        {/* Module Card 3 */}
                        <div className={styles.moduleCard}>
                            <div className={`${styles.moduleShape} ${styles.bgNavy}`}>
                                <div className={styles.moduleIcon}><Calendar size={48} strokeWidth={1.5} color="white" /></div>
                            </div>
                            <div className={styles.moduleInfo}>
                                <h3>Agenda Inteligente</h3>
                                <p>Visualização por funcionário, dia ou semana. Nunca mais perca um horário.</p>
                            </div>
                        </div>

                        {/* Module Card 4 */}
                        <div className={styles.moduleCard}>
                            <div className={`${styles.moduleShape} ${styles.bgCoralLight}`}>
                                <div className={styles.moduleIcon}><Store size={48} strokeWidth={1.5} color="var(--color-coral)" /></div>
                            </div>
                            <div className={styles.moduleInfo}>
                                <h3>PDV & Estoque</h3>
                                <p>Venda rápida, controle de estoque com alertas mínimos e leitor de código de barras.</p>
                            </div>
                        </div>

                        {/* Module Card 5 */}
                        <div className={styles.moduleCard}>
                            <div className={`${styles.moduleShape} ${styles.bgSkyLight}`}>
                                <div className={styles.moduleIcon}><PieChart size={48} strokeWidth={1.5} color="var(--color-sky)" /></div>
                            </div>
                            <div className={styles.moduleInfo}>
                                <h3>Financeiro Automático</h3>
                                <p>DRE, contas a pagar, contas a receber e fechamentos de caixa em tempo real.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Differentials Section (WhatsApp Focus) */}
            <section id="diferenciais" className={styles.differentialsSection}>
                <div className={styles.container}>
                    <div className={styles.diffGrid}>
                        <div className={styles.diffImageWrapper}>
                            <img
                                src="/wa-dog-phone.jpg"
                                alt="Pomeranian with Phone"
                            />
                            <div className={styles.whatsappMockup}>
                                {/* Chat Header */}
                                <div className={styles.waHeader}>
                                    <div className={styles.waHeaderAvatar}>
                                        <Image src="/logo.png" alt="MyPet Flow" width={30} height={30} />
                                    </div>
                                    <div className={styles.waHeaderInfo}>
                                        <strong>Seu Pet Shop</strong>
                                        <span>bot</span>
                                    </div>
                                </div>

                                {/* Chat Body */}
                                <div className={styles.waBody}>
                                    <div className={styles.waMessageOut}>
                                        Oi Maria! O banho do Theo está agendado hoje às 14:00. Podemos confirmar? 🛁
                                        <span className={styles.waTime}>09:00</span>
                                    </div>
                                    <div className={styles.waMessageIn}>
                                        Oi! Sim, está confirmadíssimo!
                                        <span className={styles.waTime}>09:05</span>
                                    </div>
                                    <div className={styles.waMessageOut}>
                                        <div style={{ display: 'flex', gap: '5px', alignItems: 'center', marginBottom: '4px' }}>
                                            <span style={{ fontSize: '1.2rem' }}>🐶</span>
                                            <span>Foto</span>
                                        </div>
                                        O Theo já está pronto, cheiroso e te esperando!
                                        <span className={styles.waTime}>15:30</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className={styles.diffContent}>
                            <span className={styles.diffTag}>Automação que Vende</span>
                            <h2 className={styles.diffTitle}>Atenda Melhor. Venda Mais. Pelo WhatsApp.</h2>
                            <p className={styles.diffDesc}>
                                O MyPetFlow se comunica sozinho com os pais dos Pets. Menos tempo no celular respondendo mensagens, mais tempo focado na qualidade do serviço. Trabalhe com a ferramenta que seu cliente já usa todo dia.
                            </p>

                            <ul className={styles.featureList}>
                                <li>
                                    <div className={styles.checkIcon}>✓</div>
                                    <span><strong>Confirmação de Agendamento</strong>: Reduza as faltas cancelando ou confirmando horários automaticamente.</span>
                                </li>
                                <li>
                                    <div className={styles.checkIcon}>✓</div>
                                    <span><strong>Avisos de "Pet Pronto"</strong>: Sem espera na recepção. O app avisa o tutor assim que o petinho sair do banho.</span>
                                </li>
                                <li>
                                    <div className={styles.checkIcon}>✓</div>
                                    <span><strong>Lembretes de Renovação</strong>: O tutor recebe uma mensagem quando o pacote de banho ou creche estiver acabando.</span>
                                </li>
                                <li>
                                    <div className={styles.checkIcon}>✓</div>
                                    <span><strong>Diário da Creche/Hospedagem</strong>: Envie fotos e reports do dia-a-dia direto no zap.</span>
                                </li>
                            </ul>

                            <Link href="/cadastro-empresa" className={styles.primaryBtn} style={{ display: 'inline-block' }}>
                                Quero no meu Pet Shop
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="planos" className={styles.pricingSection}>
                <div className={styles.container}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>Planos Simples e Transparentes</h2>
                        <p className={styles.sectionSubtitle}>Escolha o plano ideal para o momento do seu negócio. Sem surpresas.</p>
                    </div>

                    <div className={styles.pricingGrid}>
                        {activePlans.length > 0 ? activePlans.map((plan, index) => {
                            // Define if it is the "Popular" plan (middle one or index 1, usually the 'Crescimento' or Pro)
                            const isPopular = activePlans.length >= 3 ? index === 1 : index === 0;

                            return (
                                <div key={plan.id} className={`${styles.pricingCard} ${isPopular ? styles.popular : ''}`}>
                                    {isPopular && <div className={styles.popularBadge}>O Mais Escolhido</div>}
                                    <h3 className={styles.planName}>{plan.name}</h3>
                                    <div className={styles.planPrice}>
                                        <span>R$</span>{plan.price}<span>/mês</span>
                                    </div>
                                    <ul className={styles.pricingFeatures}>
                                        {plan.features && plan.features.length > 0 ? (
                                            plan.features.map(feature => {
                                                // Humanize feature keys or render as is if they are descriptions
                                                const featureNames: Record<string, string> = {
                                                    'agenda': 'Agenda Inteligente',
                                                    'customers': 'Gestão de Tutores e Pets',
                                                    'services': 'Catálogo de Serviços',
                                                    'finance': 'Financeiro Completo',
                                                    'timeclock': 'Ponto de Funcionários',
                                                    'creche': 'Creche & Hospedagem',
                                                    'banho_tosa': 'Banho e Tosa',
                                                    'pacotes': 'Pacotes Recorrentes',
                                                    'petshop': 'PDV / Pet Shop',
                                                    'relatorios': 'Relatórios Avançados',
                                                    'whatsapp': 'Automação de WhatsApp'
                                                };
                                                const displayName = featureNames[feature] || feature;
                                                return <li key={feature}>✓ {displayName}</li>
                                            })
                                        ) : (
                                            <>
                                                <li>✓ Todas as funcionalidades base</li>
                                                <li>✓ Suporte via Chat</li>
                                            </>
                                        )}
                                    </ul>
                                    <Link href="/cadastro-empresa" className={`${styles.pricingBtn} ${isPopular ? styles.btnSolid : styles.btnOutline}`}>
                                        {isPopular ? 'Assinar Plano' : 'Começar Grátis'}
                                    </Link>
                                </div>
                            )
                        }) : (
                            <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#718096', padding: '2rem' }}>
                                Não há planos disponíveis no momento.
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className={styles.footer}>
                <div className={styles.container}>
                    <div className={styles.footerGrid}>
                        <div className={styles.footerBrand}>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <Image src="/LOGO-02.png" alt="MyPet Flow" width={180} height={50} />
                            </div>
                            <p>Transformando a gestão de Pet Shops, Clínicas, Creches e Hospedagens com tecnologia feita para quem ama animais.</p>

                            <div className={styles.socialLinks}>
                                <a href="#" aria-label="Instagram" className={styles.socialIcon}>IG</a>
                                <a href="#" aria-label="Facebook" className={styles.socialIcon}>FB</a>
                                <a href="#" aria-label="WhatsApp" className={styles.socialIcon}>WA</a>
                            </div>
                        </div>

                        <div className={styles.footerLinks}>
                            <h4>Produto</h4>
                            <ul>
                                <li><a href="#modulos">Funcionalidades</a></li>
                                <li><a href="#planos">Planos e Preços</a></li>
                                <li><a href="#diferenciais">Por que o MyPetFlow?</a></li>
                                <li><a href="#">Atualizações</a></li>
                            </ul>
                        </div>

                        <div className={styles.footerLinks}>
                            <h4>Links Úteis</h4>
                            <ul>
                                <li><Link href="/cadastro-empresa">Cadastrar Empresa</Link></li>
                                <li><Link href="/cadastro">Sou Tutor (Cliente)</Link></li>
                                <li><a href="mailto:contato@mypetflow.com.br">Suporte (Contato)</a></li>
                                <li><a href="#">Termos de Uso</a></li>
                            </ul>
                        </div>
                    </div>

                    <div className={styles.footerBottom}>
                        <p>© {new Date().getFullYear()} MyPet Flow. Todos os direitos reservados.</p>
                        <p>Desenvolvido com ❤️ para Pets.</p>
                    </div>
                </div>
            </footer>
        </main>
    )
}
