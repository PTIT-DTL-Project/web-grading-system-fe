import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Button, Layout, Spin, Tree, Typography } from 'antd'
import { DownloadOutlined, FileOutlined, FolderOpenOutlined } from '@ant-design/icons'
import { Editor } from '@monaco-editor/react'
import { editor } from 'monaco-editor'
import { getSubmissionDownloadUrl, getSubmissionTree, getSubmissionFile } from '../../shared/api/endpoints/submissions'
import type { SubmissionZipTreeResponse, ZipTreeNode, SubmissionZipFileResponse } from '../../shared/types/submission'
import { useParams } from 'react-router'
import { useTranslation } from 'react-i18next'

const MAX_PREVIEW_BYTES = 2 * 1024 * 1024

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
    } catch (err) {
      setTreeError('Failed to load submission tree')
      console.error('Failed to load submission tree', err)
    } finally {
      setLoading(false)
    }
  }, [submissionId])

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
    }
    return map[mime || ''] || 'plaintext'
  }

  if (loading) {
    return <Spin size="large" />
  }

  if (treeError) {
    return (
      <Layout style={{ height: '100vh' }}>
        <Layout.Header style={{ padding: '0 24px', background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
          <Button
            icon={<DownloadOutlined />}
            onClick={() => window.history.back()}
          >
            {t('submission.back', 'Back to submissions')}
          </Button>
        </Layout.Header>
        <Layout.Content style={{ padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Alert message={t('submission.loadError', 'Could not load file content')} description={treeError} type="error" showIcon />
        </Layout.Content>
      </Layout>
    )
  }

  if (!tree) {
    return null
  }

  const rootNode = tree.root
  if (!rootNode) {
    return null
  }

  return (
    <Layout style={{ height: '100vh' }}>
      <Layout.Header style={{ padding: '0 24px', background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Button icon={<DownloadOutlined />} onClick={handleDownloadZip}>
            {t('submission.downloadZip', 'Download entire zip')}
          </Button>
          <Button onClick={() => window.history.back()}>
            {t('submission.back', 'Back to submissions')}
          </Button>
        </div>
      </Layout.Header>
      <Layout>
        <Layout.Sider width={280} style={{ overflow: 'auto', borderRight: '1px solid #f0f0f0' }}>
          <Typography.Title level={5} style={{ margin: 16, marginBottom: 8 }}>
            {t('submission.zipTree', 'Directory tree')}
          </Typography.Title>
          {treeError ? (
            <Alert message={treeError} type="error" showIcon style={{ margin: 16 }} />
          ) : null}
          <Tree
            blockNode
            expandedKeys={expandedKeys}
            onExpand={(expandedKeys: React.Key[]) => {
              setExpandedKeys(expandedKeys)
            }}
            onSelect={(_selectedKeys, info) => {
              const node = info.node as unknown as ZipTreeNode
              if (!submissionId || node.type !== 'file') return
              setSelectedKey(node.path)
              setFileError(null)
              setFileLoading(true)
              getSubmissionFile(submissionId, node.path)
                .then((data) => {
                  setFileContent(data)
                })
                .catch((err) => {
                  setFileError('Failed to load file content')
                  console.error('Failed to load file content', err)
                })
                .finally(() => {
                  setFileLoading(false)
                })
            }}
            selectedKeys={selectedKey ? [selectedKey] : []}
            showIcon
          >
            {rootNode.children?.map((node: ZipTreeNode) => (
              <Tree.TreeNode
                key={node.path}
                title={node.name}
                icon={node.type === 'file' ? <FileOutlined /> : <FolderOpenOutlined />}
              />
            ))}
          </Tree>
        </Layout.Sider>
        <Layout.Content style={{ padding: 24, overflow: 'auto' }}>
          {fileError ? (
            <Alert message={t('submission.loadError', 'Could not load file content')} description={fileError} type="error" showIcon />
          ) : fileLoading ? (
            <Spin size="large" />
          ) : fileContent ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <Typography.Title level={5} style={{ margin: 0 }}>
                    {t('submission.fileContent', 'File content')}
                  </Typography.Title>
                  <Typography.Text type="secondary" style={{ fontSize: 12, marginTop: 4 }}>
                    {fileContent.path}
                  </Typography.Text>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={handleDownloadFile}
                    disabled={fileContent.isBinary || !fileContent.content}
                  >
                    {t('submission.downloadFile', 'Download this file')}
                  </Button>
                </div>
              </div>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {fileContent.isBinary ? 'application/octet-stream' : fileContent.mime}
                {' | '}
                {fileContent.size} bytes
              </Typography.Text>
              {fileContent.truncated && (
                <Alert
                  message={t('submission.largeFile', 'File too large, showing first {{size}}KB', { size: Math.floor(MAX_PREVIEW_BYTES / 1024) })}
                  type="warning"
                  showIcon
                  style={{ marginTop: 16 }}
                />
              )}
              {fileContent.isBinary ? (
                <Alert
                  message={t('submission.binaryFile', 'File nhị phân, không thể xem trước')}
                  description={fileContent.message}
                  type="info"
                  showIcon
                />
              ) : (
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
                  }}
                  onMount={(editorInstance) => {
                    editorRef.current = editorInstance
                  }}
                />
              )}
            </div>
          ) : (
            <Alert message={t('submission.loadError', 'Could not load file content')} type="error" showIcon />
          )}
        </Layout.Content>
      </Layout>
    </Layout>
  )
}

export default SubmissionZipViewer
