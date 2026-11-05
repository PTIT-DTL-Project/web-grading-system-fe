import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Button, Spin, Tree, Typography } from 'antd'
import type { DataNode } from 'antd/es/tree'
import { DownloadOutlined, FileOutlined, FolderOpenOutlined, FolderOutlined } from '@ant-design/icons'
import { Editor } from '@monaco-editor/react'
import { editor } from 'monaco-editor'
import { getSubmissionDownloadUrl, getSubmissionTree, getSubmissionFile } from '../../shared/api/endpoints/submissions'
import type { SubmissionZipTreeResponse, ZipTreeNode, SubmissionZipFileResponse } from '../../shared/types/submission'
import { useParams } from 'react-router'
import { useTranslation } from 'react-i18next'

const MAX_PREVIEW_BYTES = 2 * 1024 * 1024

/** Height of the app shell chrome around the viewer: 72px header + 2×24px content padding + 2×24px card padding + 2px border. */
const VIEWER_HEIGHT = 'calc(100vh - 170px)'

function displayName(node: ZipTreeNode): string {
  // Older backend builds returned an empty name for explicit zip directory
  // entries ("src/"). Fall back to the last path segment so folders stay
  // labelled until the fixed backend is deployed.
  if (node.name) return node.name
  const path = node.path.replace(/\/+$/, '')
  return path.slice(path.lastIndexOf('/') + 1) || path
}

function toTreeData(node: ZipTreeNode, expanded: Set<string>): DataNode {
  // Folder icons reflect the expanded state; file icons mark leaves.
  return {
    key: node.path,
    title: displayName(node),
    icon:
      node.type === 'file'
        ? <FileOutlined />
        : expanded.has(node.path)
          ? <FolderOpenOutlined />
          : <FolderOutlined />,
    children: node.children?.map((child) => toTreeData(child, expanded)),
  }
}

/**
 * Zip root is often a single project folder (e.g. book-app-login-v1/).
 * Unwrap one level so files like Dockerfile, mvnw appear at the top.
 */
function viewerRootNodes(root: ZipTreeNode): ZipTreeNode[] {
  const children = root.children ?? []
  if (children.length === 1 && children[0].type === 'folder') {
    return children[0].children ?? []
  }
  return children
}

function findNode(nodes: ZipTreeNode[] | undefined, path: string): ZipTreeNode | undefined {
  if (!nodes) return undefined
  for (const node of nodes) {
    if (node.path === path) return node
    const found = findNode(node.children, path)
    if (found) return found
  }
  return undefined
}

export function SubmissionZipViewer() {
  const { submissionId } = useParams<{ submissionId: string }>()
  const { t } = useTranslation()
  const [tree, setTree] = useState<SubmissionZipTreeResponse | null>(null)
  const [treeError, setTreeError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [fileContent, setFileContent] = useState<SubmissionZipFileResponse | null>(null)
  const [fileLoading, setFileLoading] = useState<boolean>(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [selectedKey, setSelectedKey] = useState<string>('')
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([])
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)

  const loadTree = useCallback(async () => {
    if (!submissionId) return
    setLoading(true)
    setTreeError(null)
    try {
      const data = await getSubmissionTree(submissionId)
      setTree(data)
      setExpandedKeys(
        viewerRootNodes(data.root)
          .filter((node) => node.type === 'folder')
          .map((node) => node.path),
      )
    } catch (err) {
      setTreeError(err instanceof Error ? err.message : t('submission.loadError', 'Could not load file content'))
      console.error('Failed to load submission tree', err)
    } finally {
      setLoading(false)
    }
  }, [submissionId, t])

  useEffect(() => {
    loadTree()
  }, [loadTree])

  const handleDownloadZip = async () => {
    if (!submissionId) return
    try {
      const data = await getSubmissionDownloadUrl(submissionId)
      window.location.assign(data.downloadUrl)
    } catch (err) {
      console.error('Failed to get download URL', err)
    }
  }

  const handleDownloadFile = () => {
    if (!fileContent?.content) return
    const blob = new Blob([fileContent.content], { type: fileContent.mime || 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileContent.path.split('/').pop() || 'download'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const mimeToLanguage = (mime: string | undefined): string => {
    const map: Record<string, string> = {
      'text/x-java': 'java',
      'text/x-python': 'python',
      'text/javascript': 'javascript',
      'text/typescript': 'typescript',
      'text/markdown': 'markdown',
      'text/plain': 'plaintext',
      'application/json': 'json',
      'application/xml': 'xml',
      'text/html': 'html',
      'text/css': 'css',
      'text/x-kotlin': 'kotlin',
      'text/x-go': 'go',
      'text/x-rust': 'rust',
      'text/x-c': 'c',
      'text/x-cpp': 'cpp',
      'text/x-c++': 'cpp',
      'text/yaml': 'yaml',
      'text/toml': 'toml',
      'text/ini': 'ini',
      'text/x-sql': 'sql',
      'text/x-shellscript': 'shell',
      'text/x-batch': 'batch',
      'text/x-dockerfile': 'dockerfile',
    }
    return map[mime || ''] || 'plaintext'
  }

  const handleSelect = (path: string) => {
    if (!submissionId) return
    const node = findNode(tree?.root.children, path)
    if (!node || node.type !== 'file') return
    setSelectedKey(path)
    setFileContent(null)
    setFileError(null)
    setFileLoading(true)
    getSubmissionFile(submissionId, path)
      .then((data) => {
        setFileContent(data)
      })
      .catch((err) => {
        setFileError(err instanceof Error ? err.message : t('submission.loadError', 'Could not load file content'))
        console.error('Failed to load file content', err)
      })
      .finally(() => {
        setFileLoading(false)
      })
  }

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!tree || !tree.root) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Alert
          message={t('submission.loadError', 'Could not load file content')}
          description={treeError}
          type="error"
          showIcon
        />
        <Button onClick={() => window.history.back()}>{t('submission.back', 'Back to submissions')}</Button>
      </div>
    )
  }

  const treeNodes = viewerRootNodes(tree.root)
  const expanded = new Set(expandedKeys.map(String))
  const treeData = treeNodes.map((node) => toTreeData(node, expanded))

  return (
    <div
      style={{
        display: 'flex',
        height: VIEWER_HEIGHT,
        minHeight: 420,
        border: '1px solid #f0f0f0',
        borderRadius: 8,
        overflow: 'hidden',
        background: '#fff',
      }}
    >
      <aside
        style={{
          width: 280,
          flex: '0 0 280px',
          overflow: 'auto',
          borderRight: '1px solid #f0f0f0',
          background: '#fafafa',
          padding: 12,
        }}
      >
        <Typography.Title level={5} style={{ margin: '4px 4px 12px' }}>
          {t('submission.zipTree', 'Directory tree')}
        </Typography.Title>
        {treeError ? (
          <Alert message={treeError} type="error" showIcon />
        ) : (
          <Tree
            showIcon
            blockNode
            showLine={{ showLeafIcon: false }}
            expandedKeys={expandedKeys}
            onExpand={(keys) => setExpandedKeys(keys)}
            treeData={treeData}
            selectedKeys={selectedKey ? [selectedKey] : []}
            onSelect={(keys) => {
              if (keys.length > 0) handleSelect(String(keys[0]))
            }}
          />
        )}
      </aside>

      <section
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          padding: 16,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
            marginBottom: 12,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <Typography.Title level={5} style={{ margin: 0 }}>
              {t('submission.fileContent', 'File content')}
            </Typography.Title>
            {fileContent ? (
              <Typography.Text type="secondary" style={{ fontSize: 12 }} ellipsis>
                {fileContent.path}
              </Typography.Text>
            ) : null}
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <Button icon={<DownloadOutlined />} onClick={handleDownloadZip}>
              {t('submission.downloadZip', 'Download entire zip')}
            </Button>
            {fileContent ? (
              <Button
                icon={<DownloadOutlined />}
                onClick={handleDownloadFile}
                disabled={fileContent.isBinary || !fileContent.content}
              >
                {t('submission.downloadFile', 'Download this file')}
              </Button>
            ) : null}
            <Button onClick={() => window.history.back()}>{t('submission.back', 'Back to submissions')}</Button>
          </div>
        </div>

        {fileError ? (
          <Alert
            message={t('submission.loadError', 'Could not load file content')}
            description={fileError}
            type="error"
            showIcon
          />
        ) : fileLoading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Spin size="large" />
          </div>
        ) : fileContent ? (
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <Typography.Text type="secondary" style={{ fontSize: 12, marginBottom: 8 }}>
              {fileContent.isBinary ? 'application/octet-stream' : fileContent.mime}
              {' | '}
              {fileContent.size} bytes
            </Typography.Text>
            {fileContent.truncated ? (
              <Alert
                message={t('submission.largeFile', 'File too large, showing first {{size}}KB', {
                  size: Math.floor(MAX_PREVIEW_BYTES / 1024),
                })}
                type="warning"
                showIcon
                style={{ marginBottom: 8 }}
              />
            ) : null}
            {fileContent.isBinary ? (
              <Alert
                message={t('submission.binaryFile', 'File nhị phân, không thể xem trước')}
                description={fileContent.message}
                type="info"
                showIcon
              />
            ) : (
              <div style={{ flex: 1, minHeight: 0, border: '1px solid #f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
                <Editor
                  height="100%"
                  language={mimeToLanguage(fileContent.mime)}
                  value={fileContent.content || ''}
                  theme="vs-light"
                  options={{
                    readOnly: true,
                    minimap: { enabled: true },
                    wordWrap: 'on',
                    fontSize: 14,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                  }}
                  onMount={(editorInstance) => {
                    editorRef.current = editorInstance
                  }}
                />
              </div>
            )}
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography.Text type="secondary">
              {t('submission.selectFile', 'Select a file from the tree to view its content')}
            </Typography.Text>
          </div>
        )}
      </section>
    </div>
  )
}

export default SubmissionZipViewer
