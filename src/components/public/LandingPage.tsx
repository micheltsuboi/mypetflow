'use client'

import Image from 'next/image'
import Link from 'next/link'
import styles from './LandingPage.module.css'

export default function LandingPage() {
    return (
        <main className={styles.main}>
            {/* Navbar */}
            <header className={styles.header}>
                <div className={styles.container}>
                    <div className={styles.navInner}>
                        <div className={styles.logo}>
                            <Image src="/logo.png" alt="MyPet Flow" width={180} height={40} className={styles.logoImage} priority />
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
                                <Image src="https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=600&auto=format&fit=crop" alt="Dog" width={300} height={400} className={styles.petImage1} />
                            </div>
                            <div className={styles.shapeSky}>
                                <Image src="https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=400&auto=format&fit=crop" alt="Cat" width={200} height={200} className={styles.petImage2} />
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
                                <div className={styles.moduleIcon}>🛁</div>
                            </div>
                            <div className={styles.moduleInfo}>
                                <h3>Banho e Tosa</h3>
                                <p>Agendamento fácil, pacotes mensais, checklist de serviços e comissionamento.</p>
                            </div>
                        </div>

                        {/* Module Card 2 */}
                        <div className={styles.moduleCard}>
                            <div className={`${styles.moduleShape} ${styles.bgSky}`}>
                                <div className={styles.moduleIcon}>🐾</div>
                            </div>
                            <div className={styles.moduleInfo}>
                                <h3>Creche & Hospedagem</h3>
                                <p>Controle de check-in, check-out, avaliação comportamental e histórico completo do Pet.</p>
                            </div>
                        </div>

                        {/* Module Card 3 */}
                        <div className={styles.moduleCard}>
                            <div className={`${styles.moduleShape} ${styles.bgNavy}`}>
                                <div className={styles.moduleIcon}>📅</div>
                            </div>
                            <div className={styles.moduleInfo}>
                                <h3>Agenda Inteligente</h3>
                                <p>Visualização por funcionário, dia ou semana. Nunca mais perca um horário.</p>
                            </div>
                        </div>

                        {/* Module Card 4 */}
                        <div className={styles.moduleCard}>
                            <div className={`${styles.moduleShape} ${styles.bgCoralLight}`}>
                                <div className={styles.moduleIcon}>🛍️</div>
                            </div>
                            <div className={styles.moduleInfo}>
                                <h3>PDV & Estoque</h3>
                                <p>Venda rápida, controle de estoque com alertas mínimos e leitor de código de barras.</p>
                            </div>
                        </div>

                        {/* Module Card 5 */}
                        <div className={styles.moduleCard}>
                            <div className={`${styles.moduleShape} ${styles.bgSkyLight}`}>
                                <div className={styles.moduleIcon}>💰</div>
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
                            <Image
                                src="https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?q=80&w=800&auto=format&fit=crop"
                                alt="Dog Looking at Phone"
                                width={500}
                                height={600}
                            />
                            {/* Floating WhatsApp Badge */}
                            <div className={styles.whatsappBadge}>
                                <div className={styles.waIcon}>
                                    {/* Simple WA Icon using SVG or emoji */}
                                    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.878-.788-1.47-1.761-1.643-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" /></svg>
                                </div>
                                <div className={styles.waText}>
                                    <strong>Lembrete Automático</strong>
                                    <span>"O banho do Theo está pronto! 🐶"</span>
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
                        {/* Start Plan */}
                        <div className={styles.pricingCard}>
                            <h3 className={styles.planName}>Start</h3>
                            <div className={styles.planPrice}>
                                <span>R$</span>97<span>/mês</span>
                            </div>
                            <ul className={styles.pricingFeatures}>
                                <li>✓ Até 2 Profissionais</li>
                                <li>✓ Agenda Completa</li>
                                <li>✓ Cadastro de Tutores e Pets</li>
                                <li>✓ Lembretes por WhatsApp (Manual)</li>
                                <li>✓ Suporte via Chat</li>
                            </ul>
                            <Link href="/cadastro-empresa" className={`${styles.pricingBtn} ${styles.btnOutline}`}>
                                Começar Grátis
                            </Link>
                        </div>

                        {/* Pro Plan (Popular) */}
                        <div className={`${styles.pricingCard} ${styles.popular}`}>
                            <div className={styles.popularBadge}>O Mais Escolhido</div>
                            <h3 className={styles.planName}>Crescimento</h3>
                            <div className={styles.planPrice}>
                                <span>R$</span>197<span>/mês</span>
                            </div>
                            <ul className={styles.pricingFeatures}>
                                <li>✓ Até 5 Profissionais</li>
                                <li>✓ Banho e Tosa (Pacotes)</li>
                                <li>✓ Controle de Caixa (PDV)</li>
                                <li>✓ WhatsApp 100% Automático</li>
                                <li>✓ Relatórios Básicos</li>
                            </ul>
                            <Link href="/cadastro-empresa" className={`${styles.pricingBtn} ${styles.btnSolid}`}>
                                Assinar Plano
                            </Link>
                        </div>

                        {/* Premium Plan */}
                        <div className={styles.pricingCard}>
                            <h3 className={styles.planName}>Múltiplo</h3>
                            <div className={styles.planPrice}>
                                <span>R$</span>347<span>/mês</span>
                            </div>
                            <ul className={styles.pricingFeatures}>
                                <li>✓ Profissionais Ilimitados</li>
                                <li>✓ Creche & Hospedagem</li>
                                <li>✓ DRE e Financeiro Avançado</li>
                                <li>✓ Controle de Ponto (Relógio)</li>
                                <li>✓ Suporte Prioritário</li>
                            </ul>
                            <Link href="/cadastro-empresa" className={`${styles.pricingBtn} ${styles.btnOutline}`}>
                                Falar com Vendas
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className={styles.footer}>
                <div className={styles.container}>
                    <div className={styles.footerGrid}>
                        <div className={styles.footerBrand}>
                            <Image src="/logo.png" alt="MyPet Flow" width={180} height={40} style={{ filter: 'brightness(0) invert(1)' }} />
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
