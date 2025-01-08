// ignore ts linting for this file
// @ts-nocheck
import ReactMarkdown from 'react-markdown'
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter'
import tsx from 'react-syntax-highlighter/dist/cjs/languages/prism/tsx'
import typescript from 'react-syntax-highlighter/dist/cjs/languages/prism/typescript'
import scss from 'react-syntax-highlighter/dist/cjs/languages/prism/scss'
import bash from 'react-syntax-highlighter/dist/cjs/languages/prism/bash'
import markdown from 'react-syntax-highlighter/dist/cjs/languages/prism/markdown'
import json from 'react-syntax-highlighter/dist/cjs/languages/prism/json'
import html from 'react-syntax-highlighter/dist/cjs/languages/prism/markup'
import footnotes from 'remark-footnotes'

SyntaxHighlighter.registerLanguage('tsx', tsx)
SyntaxHighlighter.registerLanguage('typescript', typescript)
SyntaxHighlighter.registerLanguage('scss', scss)
SyntaxHighlighter.registerLanguage('bash', bash)
SyntaxHighlighter.registerLanguage('markdown', markdown)
SyntaxHighlighter.registerLanguage('json', json)
SyntaxHighlighter.registerLanguage('markup', html)

import rangeParser from 'parse-numeric-range'
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism'


const Markdown = ({ children, className }: { children: string, className?: string }) => {
  const syntaxTheme = oneDark

  const MarkdownComponents: object = {
    a: ({ node, ...props }) => {
      if (props?.children?.[0]?.match(/\^[0-9]/)) {
        props.children[0] = props.children[0].replace(/\^/, '')
        props.children[0] = props.children[0].replace(/([0-9]+)/, '[$1]')
        return (
          <sup>
            <a
              {...props}
              target="_blank"
              rel="noopener noreferrer"
              className="light selection:bg-super ml-1 inline font-mono text-xs font-bold uppercase leading-none tracking-widest text-zinc-500 selection:bg-opacity-70 selection:text-white dark:selection:bg-opacity-50"
            />
          </sup>
        )
      } else {
        return (
          <a
            {...props}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          />
        )
      }
    },
    // pre: Pre,
    code({ node, inline, className, ...props }) {
      const hasLang = /language-(\w+)/.exec(className || '')
      const hasMeta = node?.data?.meta

      const applyHighlights: object = (applyHighlights: number) => {
        if (hasMeta) {
          const RE = /{([\d,-]+)}/
          const metadata = node.data.meta?.replace(/\s/g, '')
          const strlineNumbers = RE?.test(metadata)
            ? RE?.exec(metadata)[1]
            : '0'
          const highlightLines = rangeParser(strlineNumbers)
          const highlight = highlightLines
          const data: string = highlight.includes(applyHighlights)
            ? 'highlight'
            : null
          console.log(data)
          return { data }
        } else {
          return {}
        }
      }

      return hasLang ? (
        <SyntaxHighlighter
          style={syntaxTheme}
          language={hasLang[1]}
          PreTag="div"
          className="codeStyle"
          showLineNumbers={true}
          wrapLines={hasMeta}
          useInlineStyles={true}
          lineProps={applyHighlights}
        >
          {props.children}
        </SyntaxHighlighter>
      ) : (
        <code className={className} {...props} />
      )
    },
  }

  return (
    <ReactMarkdown
      remarkPlugins={[footnotes]}
      className={"prose overflow-y-scroll " + className}
      components={MarkdownComponents}
    >
      {children}
    </ReactMarkdown>
  )
}

export default Markdown